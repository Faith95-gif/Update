@@ .. @@
     socket.on('updateUsers', (userList) => {
         users = userList;
         updateParticipantsList();
+        
+        // Update current user's display name if it changed
+        if (userList[socket.id] && userList[socket.id] !== currentUserName) {
+            currentUserName = userList[socket.id];
+            console.log('Chat name updated to:', currentUserName);
+        }
     });
+    
+    // Listen for direct chat name updates
+    socket.on('updateChatName', (newName) => {
+        if (newName && newName.trim().length > 0) {
+            currentUserName = newName.trim();
+            console.log('Direct chat name update:', currentUserName);
+        }
+    });

     socket.on('receiveGeneralMessage', (data) => {
         addMessage(data, 'general');
     });