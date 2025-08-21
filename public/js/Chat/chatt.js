@@ .. @@
     socket.on('updateUsers', (userList) => {
         users = userList;
         updateParticipantsList();
        
        // Update current user's display name if it changed
        if (userList[socket.id] && userList[socket.id] !== currentUserName) {
            currentUserName = userList[socket.id];
            console.log('Chat name updated to:', currentUserName);
        }
     });
    
    // Listen for direct chat name updates
    socket.on('updateChatName', (newName) => {
        if (newName && newName.trim().length > 0) {
            currentUserName = newName.trim();
            console.log('Direct chat name update:', currentUserName);
        }
    });

     socket.on('receiveGeneralMessage', (data) => {
         addMessage(data, 'general');
     });

     // Initialize chat
     function initializeChat() {
         console.log('Initializing chat...');
         
         // Get user name from session storage or prompt
         currentUserName = sessionStorage.getItem('userName') || 'Anonymous';
         
         // Register with server
         socket.emit('register', currentUserName);
        
        // Listen for participant name changes from the meeting system
        window.addEventListener('participantNameChanged', (event) => {
            const newName = event.detail.newName;
            if (newName && newName !== currentUserName) {
                currentUserName = newName;
                socket.emit('register', currentUserName);
                console.log('Chat name synchronized with meeting name:', newName);
            }
        });
         
         // Load existing groups
         loadGroups();
         
         // Set initial chat to general
         selectChat('general');
         
         console.log('Chat initialized for user:', currentUserName);
     }