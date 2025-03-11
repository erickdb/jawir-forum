const express = require('express');
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const socket = require('socket.io');
const session = require('express-session');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = socket(server);

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: 'jawiracademy',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 3600000,
            secure: false,
            httpOnly: true,
            sameSite: 'lax'
        }
    })
);

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_forum'
});

db.connect((err) => {
    if (err) throw err;
    console.log('MySQL connected');
});

function isValidPassword(password) {
    const regEx = /^(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return regEx.test(password);
}

function isAuthenticated(req, res, next) {
    if (req.session.isLoggedIn) {
        if (req.path === '/login' || req.path === '/register' || req.path === '/' || req.path === '/login-process' || req.path === '/register-process') {
            return res.redirect('/forum');
        }
    } else {
        if (req.path !== '/' && req.path !== '/login' && req.path !== '/register' && req.path !== '/login-process' && req.path !== '/register-process') {
            return res.redirect('/'); 
        }
    }
    next();
}

app.use(isAuthenticated);

app.get('/', (req, res) => {
    res.render('index', { tittle: 'JAWIR FORUM', error: null });
});
app.get('/login', (req, res) => {
    res.render('index', { tittle: 'JAWIR FORUM', error: null });
});
app.get('/register', (req, res) => {
    res.render('register', { tittle: 'JAWIR FORUM', error: null });
});

app.get('/forum', (req, res) => {
    const userId = req.session.user.id; // Mendapatkan ID pengguna yang sedang login
    const query = `
        SELECT p.id AS post_id,
               p.content AS post_content,
               p.createdAt AS post_createdAt,
               u.username AS post_username,
               COUNT(DISTINCT l.id) AS likes,
               EXISTS (SELECT 1 FROM \`like\` WHERE post_id = p.id AND user_id = ?) AS user_liked,
               (SELECT COUNT(*) FROM comment WHERE post_id = p.id) AS comments_count,
               c.id AS comment_id, 
               c.content AS comment_content, 
               c.createdAt AS comment_createdAt,
               cu.username AS comment_username, 
               c.parentID AS comment_parent_id
        FROM post AS p
        JOIN user AS u ON p.user_id = u.id
        LEFT JOIN \`like\` AS l ON p.id = l.post_id
        LEFT JOIN comment AS c ON p.id = c.post_id
        LEFT JOIN user AS cu ON c.user_id = cu.id
        GROUP BY p.id, c.id
        ORDER BY p.createdAt DESC, c.createdAt ASC
    `;

    db.query(query, [userId], (err, results) => {
        if (err) throw err;

        const posts = results.reduce((acc, row) => {
            let post = acc.find(p => p.id === row.post_id);
            if (!post) {
                post = {
                    id: row.post_id,
                    content: row.post_content,
                    createdAt: row.post_createdAt,
                    username: row.post_username,
                    likes: row.likes,
                    user_liked: !!row.user_liked,
                    comments_count: row.comments_count || 0,
                    comments: []
                };
                acc.push(post);
            }

            if (row.comment_id) {
                const comment = {
                    id: row.comment_id,
                    content: row.comment_content,
                    createdAt: row.comment_createdAt,
                    username: row.comment_username,
                    parentID: row.comment_parent_id,
                    replies: []  
                };

                if (comment.parentID === null) {
                    post.comments.push(comment);
                } else {
                    const parentComment = post.comments.find(c => c.id === comment.parentID);
                    if (parentComment) {
                        parentComment.replies.push(comment);
                    } else {
                        const parentCommentInReplies = findCommentById(post.comments, comment.parentID);
                        if (parentCommentInReplies) {
                            parentCommentInReplies.replies.push(comment);
                        }
                    }
                }
            }

            return acc;
        }, []);

        res.render('forum', {
            tittle: 'JAWIR FORUM',
            user: req.session.user,
            posts
        });
    });

    function findCommentById(comments, id) {
        for (const comment of comments) {
            if (comment.id === id) {
                return comment;
            }
            const reply = findCommentById(comment.replies, id);
            if (reply) {
                return reply;
            }
        }
        return null;
    }
});


app.post('/login-process', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM user WHERE username = ?';
    
    db.query(query, [username], async (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            const user = results[0];
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                req.session.save((err) => {
                    if (err) throw err;
                    res.redirect('/forum');
                });
            } else {
                res.render('index', { tittle: 'JAWIR FORUM', error: 'Invalid username or password' });
            }
        } else {
            res.render('index', { tittle: 'JAWIR FORUM', error: 'Invalid username or password' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.post('/register-process', async (req, res) => {
    const { nama, username, password } = req.body;

    if (!isValidPassword(password)) {
        return res.render('register', {
            tittle: 'JAWIR FORUM',
            error: 'Password must be at least 8 characters long, include at least one uppercase letter and one number.'
        });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const createdAt = new Date();
        const query = 'INSERT INTO user (nama, username, password, createdAt) VALUES (?, ?, ?, ?)';

        db.query(query, [nama, username, hashedPassword, createdAt], (err, result) => {
            if (err) throw err;
            res.redirect('/login');
        });
    } catch (error) {
        res.status(500).send('Error registering user');
    }
});

app.post('/add-post', (req, res) => {
    const content = req.body.content;
    console.log("Content received:", content);
    const userId = req.session.user.id;

    if (!content) {
        return res.json({ success: false, message: 'Content is required' });
    }

    const query = 'INSERT INTO post (user_id, content, createdAt) VALUES (?, ?, ?)';
    const createdAt = new Date();

    db.query(query, [userId, content, createdAt], (err, result) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Error saving post' });
        }

        const postId = result.insertId;

        const fetchPostQuery = `
            SELECT p.id, p.content, p.createdAt, u.username,
                   (SELECT COUNT(*) FROM \`like\` WHERE post_id = p.id) AS likes,
                   (SELECT COUNT(*) FROM comment WHERE post_id = p.id) AS comments_count
            FROM post AS p
            JOIN user AS u ON p.user_id = u.id
            WHERE p.id = ?
        `;

        db.query(fetchPostQuery, [postId], (err, results) => {
            if (err) {
                console.error(err);
                return res.json({ success: false, message: 'Error fetching post data' });
            }

            const post = results[0];

            io.emit('newPost', {
                id: post.id,
                username: post.username,
                content: post.content,
                createdAt: post.createdAt,
                likes: post.likes,
                comments_count: post.comments_count
            });

            res.json({ success: true, message: 'Post saved successfully' });
        });
    });
});


app.post('/add-komen', (req, res) => {
    const { contentKomen, postId, parentId } = req.body;
    const userId = req.session.user ? req.session.user.id : null;
    const createdAt = new Date();

    if (!contentKomen || !postId || !userId) {
        return res.json({ success: false, message: 'All fields are required' });
    }

    const query = 'INSERT INTO comment (post_id, user_id, parentID, content, createdAt) VALUES (?, ?, ?, ?, ?)';
    db.query(query, [postId, userId, parentId || null, contentKomen, createdAt], (err, result) => {
        if (err) {
            console.error("Error saving comment:", err);
            return res.json({ success: false, message: 'Error saving comment' });
        }

        const fetchCommentCount = `SELECT COUNT(*) AS comments_count FROM comment WHERE post_id = ?`;
        db.query(fetchCommentCount, [postId], (err, countResult) => {
            if (err) throw err;

            io.emit('newComment', {
                postId,
                comment: {
                    id: result.insertId,
                    username: req.session.user.username,
                    content: contentKomen,
                    createdAt,
                    parentID: parentId || null
                },
                comments_count: countResult[0].comments_count
            });

            res.json({ success: true, message: 'Comment saved successfully' });
        });
    });
});

app.post('/add-like', (req, res) => {
    const { postId } = req.body;
    const userId = req.session.user.id;

    if (!postId || !userId) {
        return res.json({ success: false, message: 'Post ID and User ID are required' });
    }

    // Periksa apakah user sudah like post
    const checkQuery = 'SELECT * FROM `like` WHERE user_id = ? AND post_id = ?';
    db.query(checkQuery, [userId, postId], (err, results) => {
        if (err) {
            console.error(err);
            return res.json({ success: false, message: 'Database error' });
        }

        if (results.length > 0) {
            // Jika sudah like, maka unlike
            const deleteQuery = 'DELETE FROM `like` WHERE user_id = ? AND post_id = ?';
            db.query(deleteQuery, [userId, postId], (err) => {
                if (err) {
                    console.error(err);
                    return res.json({ success: false, message: 'Failed to unlike' });
                }

                const countQuery = 'SELECT COUNT(*) AS likes FROM `like` WHERE post_id = ?';

                db.query(countQuery, [postId], (err, countResult) => {
                    if (err) {
                        console.error(err);
                        return res.json({ success: false, message: 'Failed to count likes' });
                    }
                    const likes = countResult[0].likes;
                    io.emit('newLike', { postId, likes, liked: false });

                    return res.json({ success: true, liked: false, likes });
                });
            });
        } else {
            const insertQuery = 'INSERT INTO `like` (user_id, post_id, createdAt) VALUES (?, ?, ?)';
            db.query(insertQuery, [userId, postId, new Date()], (err) => {
                if (err) {
                    console.error(err);
                    return res.json({ success: false, message: 'Failed to like' });
                }

                const countQuery = 'SELECT COUNT(*) AS likes FROM `like` WHERE post_id = ?';
                db.query(countQuery, [postId], (err, countResult) => {
                    if (err) {
                        console.error(err);
                        return res.json({ success: false, message: 'Failed to count likes' });
                    }

                    const likes = countResult[0].likes;

                    io.emit('newLike', { postId, likes, liked: true })

                    return res.json({ success: true, liked: true, likes });
                });
            });
        }
    });
});





io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.use((req, res) => {
    res.status(404).render('404');
});

server.listen(3000, () => {
    console.log('Server started on port 3000');
});
