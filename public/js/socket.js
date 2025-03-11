function newPost(emitName) {
    socket.on(emitName, (post) => {
        const postContainer = document.createElement('div');
        postContainer.className = 'max-w-xl mx-auto mt-10 bg-white border border-gray-300 rounded-xl shadow-sm scroll-post';
        postContainer.setAttribute('data-post-id', post.id);
        postContainer.innerHTML = `
            <div class="p-4 rounded-t-xl">
                <div class="flex items-center border-b pb-3">
                    <img alt="Profile picture of the user" class="w-10 h-10 rounded-full mr-3" height="40" src="/images/profile.jpg" width="40"/>
                    <div class="block">
                        <p class="font-semibold ml-2">${post.username}</p>
                        <p class="text-gray-500 ml-2">
                            ${new Date(post.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })} 
                            ${new Date(post.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} ·
                            <i class="fas fa-globe-americas"></i>
                        </p>
                    </div>
                </div>
                <div class="w-full">
                    <div class="mt-6">
                        <p class="text-lg">${post.content}</p>
                    </div>
                    <div class="mt-6 flex items-center text-gray-500 justify-between w-full">
                        <div flex items-center space-x-1 p-2>
                            <span id="like-count-${post.id}">
                                ${post.likes ?? 0} 
                            </span>
                            <i class="far fa-thumbs-up"></i>
                        </div>
                        <span id="comments-count-${post.id}">
                            ${post.comments_count ?? 0} Komentar.
                        </span>
                    </div>
                </div>
            </div>
            <div class="border-t border-gray-300"></div>
            <div class="flex justify-around p-2 text-gray-500">
                <div class="flex items-center space-x-1 cursor-pointer hover:bg-gray-200 p-2 rounded">
                    <button type="button" class="like-btn" onclick="toggleLike(${post.id})" data-post-id="${post.id}">
                        <i class="far fa-thumbs-up ${post.user_liked ? 'text-blue-500' : ''}"></i>
                        <span>Suka</span>
                    </button>
                </div>
                <div class="flex items-center space-x-1 cursor-pointer hover:bg-gray-200 p-2 rounded">
                    <div>
                        <button type="button" onclick="toggleKomentar(${post.id})" id="komentar-menu-button-${post.id}">
                            <i class="far fa-comment"></i>
                            <span>Komentar</span>
                        </button>
                    </div>
                    <div id="komentarDropdown-${post.id}" class="komentar-dropdown fixed inset-0 bg-black bg-opacity-50 hidden z-50 justify-center items-center" role="menu" aria-orientation="vertical" tabindex="-1">
                        <div class="bg-white rounded-lg w-11/12 md:w-2/3 lg:w-1/2 h-[90vh] flex flex-col overflow-y-auto p-4" onclick="event.stopPropagation()" aria-labelledby="komentar-menu-button-${post.id}">
                            <!-- Header Modal -->
                            <div class="flex justify-between items-center border-b pb-3 px-4">
                                <h2 class="text-xl font-semibold">Postingan ${post.username}</h2>
                                <button onclick="toggleKomentar(${post.id})" class="text-gray-600 hover:text-gray-800">
                                    <i class="fas fa-times text-2xl"></i>
                                </button>
                            </div>
                            <!-- Konten Postingan -->
                            <div class="mt-6 mb-6 px-4">
                                <div class="flex items-center mb-3">
                                    <img alt="Profile picture" class="w-10 h-10 rounded-full mr-3" src="/images/profile.jpg"/>
                                    <div>
                                        <p class="font-semibold">${post.username}</p>
                                        <p class="text-gray-500 text-sm">
                                            ${new Date(post.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })} 
                                            ${new Date(post.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} ·
                                            <i class="fas fa-globe-americas"></i>
                                        </p>
                                    </div>
                                </div>
                                <p class="text-gray-800 mb-3">${post.content}</p>
                            </div>
                            <!-- Komentar Section -->
                            <div class="flex-1 overflow-y-auto px-4">
                                <div class="border-t pt-4">
                                    <h3 class="font-semibold mb-3">Komentar</h3>
                                    <div class="space-y-4" id="comments-${post.id}">
                                    </div>
                                </div>
                            </div>
                            <!-- Input Komentar -->
                            <div class="border-t px-4 py-4">
                                <div class="flex items-center space-x-2">
                                    <form id="komenForm-${post.id}" onsubmit="submitKomen(event, ${post.id})" class="flex w-full">
                                        <input type="text" name="contentKomen" class="w-full flex-grow border border-gray-300 rounded-full px-4 py-2 text-gray-700" placeholder="Tulis komentar..."/>
                                        <button type="submit" class="ml-2 bg-blue-500 text-white rounded-full px-4 py-2">Kirim</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('postsContainer').prepend(postContainer);
    });
}

function newComment(emitName) {
    socket.on(emitName, (data) => {
        const { postId, comment, comments_count } = data;

        const noCommentsText = document.getElementById(`no-comments-${postId}`);
        if (noCommentsText) {
            noCommentsText.remove();
        }
        const commentCountEl = document.getElementById(`comments-count-${postId}`);
        if (commentCountEl) {
            commentCountEl.textContent = `${comments_count} Komentar.`;
        }

        // Menambahkan komentar baru ke dalam modal komentar
        const commentsSection = document.querySelector(`#comments-${postId}`);
        if (commentsSection) {
            const commentElement = document.createElement('div');
            commentElement.classList.add('flex', 'items-start', 'space-x-3');
            commentElement.innerHTML = `
                <img alt="Profile picture" class="w-8 h-8 rounded-full" src="/images/profile.jpg"/>
                <div class="bg-gray-100 p-3 rounded-lg w-full">
                    <p class="font-semibold text-sm">${comment.username}</p>
                    <p class="text-gray-700 text-sm">${comment.content}</p>
                </div>
            `;
            commentsSection.appendChild(commentElement);
        }
    });
}

function newLike(emitName) {
    socket.on(emitName, ({ postId, likes, liked }) => {
        const likeCount = document.getElementById(`like-count-${postId}`);
        const likeButton = document.querySelector(`.like-btn[data-post-id="${postId}"] i`);
        
        if (likeCount) {
            likeCount.textContent = likes;
        }

        if (likeButton) {
            if (liked) {
                likeButton.classList.add('text-blue-500');
            } else {
                likeButton.classList.remove('text-blue-500');
            }
        }
    });
}
