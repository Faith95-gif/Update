import { Server } from 'socket.io';
import cors from 'cors';

// In-memory storage for meetings and participants
const meetings = new Map();
const participants = new Map();

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle meeting creation
    socket.on('create-meeting', (data) => {
      const meetingId = generateMeetingId();
      const meeting = {
        id: meetingId,
        name: data.meetingName || `${data.hostName}'s Meeting`,
        hostId: socket.id,
        hostName: data.hostName,
        participants: [],
        createdAt: new Date(),
        options: data.options || {}
      };
      
      meetings.set(meetingId, meeting);
      
      socket.emit('meeting-created', {
        meetingId: meetingId,
        hostUrl: `/host/${meetingId}`
      });
      
      console.log(`Meeting created: ${meetingId} by ${data.hostName}`);
    });

    // Handle host joining
    socket.on('join-as-host', (data) => {
      const { meetingId, hostName, meetingName } = data;
      
      if (!meetings.has(meetingId)) {
        const meeting = {
          id: meetingId,
          name: meetingName || `${hostName}'s Meeting`,
          hostId: socket.id,
          hostName: hostName,
          participants: [],
          createdAt: new Date(),
          options: data.options || {}
        };
        meetings.set(meetingId, meeting);
      } else {
        const meeting = meetings.get(meetingId);
        meeting.hostId = socket.id;
        meeting.hostName = hostName;
        if (meetingName) {
          meeting.name = meetingName;
        }
      }
      
      socket.join(meetingId);
      participants.set(socket.id, { meetingId, name: hostName, isHost: true });
      
      // Send current meeting info to host
      const meeting = meetings.get(meetingId);
      socket.emit('meeting-info', {
        meetingId: meetingId,
        meetingName: meeting.name,
        participants: meeting.participants
      });
      
      console.log(`Host ${hostName} joined meeting ${meetingId}`);
    });

    // Handle participant joining
    socket.on('join-as-participant', (data) => {
      const { meetingId, participantName } = data;
      const meeting = meetings.get(meetingId);
      
      if (!meeting) {
        socket.emit('meeting-error', { message: 'Meeting not found' });
        return;
      }
      
      socket.join(meetingId);
      
      const participant = {
        id: socket.id,
        name: participantName,
        isHost: false,
        joinedAt: new Date()
      };
      
      meeting.participants.push(participant);
      participants.set(socket.id, { meetingId, name: participantName, isHost: false });
      
      // Notify host and other participants
      socket.to(meetingId).emit('participant-joined', {
        participant: participant,
        meetingName: meeting.name
      });
      
      // Send current meeting info to participant
      socket.emit('meeting-info', {
        meetingId: meetingId,
        meetingName: meeting.name,
        participants: meeting.participants
      });
      
      console.log(`Participant ${participantName} joined meeting ${meetingId}`);
    });

    // Handle meeting name changes
    socket.on('update-meeting-name', (data) => {
      const { meetingId, newName } = data;
      const meeting = meetings.get(meetingId);
      
      if (meeting && meeting.hostId === socket.id) {
        meeting.name = newName;
        
        // Broadcast to all participants in the meeting
        io.to(meetingId).emit('meeting-name-updated', {
          meetingName: newName
        });
        
        console.log(`Meeting ${meetingId} name updated to: ${newName}`);
      }
    });

    // Handle WebRTC signaling
    socket.on('offer', (data) => {
      socket.to(data.target).emit('offer', {
        offer: data.offer,
        sender: socket.id
      });
    });

    socket.on('answer', (data) => {
      socket.to(data.target).emit('answer', {
        answer: data.answer,
        sender: socket.id
      });
    });

    socket.on('ice-candidate', (data) => {
      socket.to(data.target).emit('ice-candidate', {
        candidate: data.candidate,
        sender: socket.id
      });
    });

    // Handle screen sharing
    socket.on('start-screen-share', (data) => {
      const participant = participants.get(socket.id);
      if (participant) {
        socket.to(participant.meetingId).emit('screen-share-started', {
          participantId: socket.id,
          participantName: participant.name
        });
      }
    });

    socket.on('stop-screen-share', (data) => {
      const participant = participants.get(socket.id);
      if (participant) {
        socket.to(participant.meetingId).emit('screen-share-stopped', {
          participantId: socket.id
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const participant = participants.get(socket.id);
      
      if (participant) {
        const meeting = meetings.get(participant.meetingId);
        
        if (meeting) {
          if (participant.isHost) {
            // Host disconnected
            socket.to(participant.meetingId).emit('host-disconnected');
          } else {
            // Remove participant from meeting
            meeting.participants = meeting.participants.filter(p => p.id !== socket.id);
            
            // Notify others
            socket.to(participant.meetingId).emit('participant-left', {
              participantId: socket.id,
              participantName: participant.name
            });
          }
        }
        
        participants.delete(socket.id);
      }
      
      console.log('User disconnected:', socket.id);
    });
  });

  return { io, setupMeetingRoutes };
}

// Generate random meeting ID
function generateMeetingId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Setup meeting-related API routes
function setupMeetingRoutes(app) {
  // Create meeting endpoint
  app.post('/api/create-meeting', (req, res) => {
    try {
      const { meetingName, hostName, options } = req.body;
      const meetingId = generateMeetingId();
      
      const meeting = {
        id: meetingId,
        name: meetingName || `${hostName}'s Meeting`,
        hostName: hostName,
        participants: [],
        createdAt: new Date(),
        options: options || {}
      };
      
      meetings.set(meetingId, meeting);
      
      res.json({
        success: true,
        meetingId: meetingId,
        hostUrl: `/host/${meetingId}`
      });
      
      console.log(`Meeting created via API: ${meetingId}`);
    } catch (error) {
      console.error('Error creating meeting:', error);
      res.status(500).json({ error: 'Failed to create meeting' });
    }
  });

  // Get meeting info endpoint
  app.get('/api/meeting/:meetingId', (req, res) => {
    const { meetingId } = req.params;
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
      success: true,
      meeting: {
        id: meeting.id,
        name: meeting.name,
        hostName: meeting.hostName,
        participantCount: meeting.participants.length,
        createdAt: meeting.createdAt
      }
    });
  });

  // Update meeting name endpoint
  app.put('/api/meeting/:meetingId/name', (req, res) => {
    const { meetingId } = req.params;
    const { newName } = req.body;
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }
    
    meeting.name = newName;
    
    res.json({
      success: true,
      meetingName: newName
    });
  });
}

export function setupCorsMiddleware(app) {
  app.use(cors());
}