import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Email transporter configuration
let transporter;
try {
    transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.SCHEDULER_EMAIL || 'convospace602@gmail.com',
            pass: process.env.SCHEDULER_EMAIL_PASSWORD || 'dikq qayo cmgq cavg'
        },
        tls: {
            rejectUnauthorized: false
        }
    });
} catch (error) {
    console.warn('⚠️ Email service not configured. Email notifications will be simulated.');
}

// In-memory storage for meetings (in production, use a database)
const meetings = new Map();

// Generate meeting ID
function generateMeetingId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Send email invitation
async function sendMeetingInvitation(email, meetingData, hostName) {
    if (!transporter) {
        console.log(`📧 [SIMULATED] Email invitation sent to: ${email}`);
        return { success: true, messageId: `sim_${Date.now()}` };
    }

    try {
        const mailOptions = {
            from: `"ConvoSpace" <${process.env.SCHEDULER_EMAIL || 'convospace602@gmail.com'}>`,
            to: email,
            subject: `You're invited to join: ${meetingData.title}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
                    <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <div style="background: linear-gradient(135deg, #667eea, #764ba2); width: 60px; height: 60px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                                <span style="color: white; font-size: 24px;">📹</span>
                            </div>
                            <h1 style="color: #1e293b; margin: 0; font-size: 24px;">You're Invited to a Meeting</h1>
                        </div>
                        
                        <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                            <h2 style="color: #334155; margin: 0 0 15px 0; font-size: 20px;">${meetingData.title}</h2>
                            <p style="color: #64748b; margin: 0 0 10px 0;"><strong>Host:</strong> ${hostName}</p>
                            <p style="color: #64748b; margin: 0 0 10px 0;"><strong>Meeting ID:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${meetingData.id}</code></p>
                            <p style="color: #64748b; margin: 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                        </div>
                        
                        <div style="text-align: center; margin-bottom: 25px;">
                            <a href="${meetingData.joinUrl}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                                🎥 Join Meeting Now
                            </a>
                        </div>
                        
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
                            <h3 style="color: #334155; margin: 0 0 15px 0; font-size: 16px;">How to Join:</h3>
                            <ol style="color: #64748b; margin: 0; padding-left: 20px;">
                                <li style="margin-bottom: 8px;">Click the "Join Meeting Now" button above</li>
                                <li style="margin-bottom: 8px;">Or visit: <a href="${meetingData.joinUrl}" style="color: #667eea;">${meetingData.joinUrl}</a></li>
                                <li style="margin-bottom: 8px;">Enter Meeting ID: <strong>${meetingData.id}</strong></li>
                            </ol>
                        </div>
                        
                        <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                            <p style="color: #92400e; margin: 0; font-size: 14px;">
                                <strong>💡 Tip:</strong> Make sure your camera and microphone are working before joining the meeting.
                            </p>
                        </div>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                                This invitation was sent from ConvoSpace Video Calling Platform
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        return { success: false, error: error.message };
    }
}

// Create meeting with invitations
router.post('/create-meeting-with-invites', async (req, res) => {
    try {
        const { meetingName, meetingId, participants = [], options = {} } = req.body;
        
        // Get current user
        const currentUser = req.user || req.session.user;
        if (!currentUser) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Generate or use provided meeting ID
        const finalMeetingId = meetingId || generateMeetingId();
        
        // Create meeting data
        const meetingData = {
            id: finalMeetingId,
            title: meetingName || 'New Meeting',
            host: currentUser.name,
            hostEmail: currentUser.email,
            participants: participants,
            joinUrl: `${req.protocol}://${req.get('host')}/join/${finalMeetingId}`,
            createdAt: new Date(),
            options: options
        };

        // Store meeting
        meetings.set(finalMeetingId, meetingData);

        // Send email invitations if participants are provided
        const emailResults = [];
        if (participants.length > 0) {
            console.log(`📧 Sending invitations to ${participants.length} participants...`);
            
            for (const email of participants) {
                try {
                    const result = await sendMeetingInvitation(email, meetingData, currentUser.name);
                    emailResults.push({ email, ...result });
                    console.log(`📧 Email invitation result for ${email}:`, result);
                } catch (error) {
                    emailResults.push({ email, success: false, error: error.message });
                    console.error(`❌ Failed to send email to ${email}:`, error);
                }
            }
        }

        console.log(`✅ Meeting created: ${meetingName} (${finalMeetingId})`);
        console.log(`📧 Email results:`, emailResults);

        res.json({
            success: true,
            meetingId: finalMeetingId,
            meetingData: meetingData,
            emailResults: emailResults,
            hostUrl: `/host/${finalMeetingId}`
        });

    } catch (error) {
        console.error('❌ Error creating meeting with invites:', error);
        res.status(500).json({
            error: 'Failed to create meeting',
            message: error.message
        });
    }
});

// Get meeting details
router.get('/meeting/:meetingId', (req, res) => {
    const { meetingId } = req.params;
    const meeting = meetings.get(meetingId);
    
    if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' });
    }
    
    res.json({
        success: true,
        meeting: meeting
    });
});

// Test email endpoint
router.post('/test-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const testMeetingData = {
            id: 'TEST1234',
            title: 'Test Meeting Invitation',
            joinUrl: `${req.protocol}://${req.get('host')}/join/TEST1234`
        };

        const result = await sendMeetingInvitation(email, testMeetingData, 'Test Host');
        
        res.json({
            success: true,
            message: 'Test email sent successfully',
            result: result
        });

    } catch (error) {
        console.error('❌ Test email error:', error);
        res.status(500).json({
            error: 'Failed to send test email',
            message: error.message
        });
    }
});

export default router;