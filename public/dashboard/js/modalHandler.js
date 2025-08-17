class DashboardModalHandler {
    constructor() {
        this.currentUser = null;
        this.participants = [];
        this.selectedEmails = [];
        this.currentMeetingData = null;
        
        this.init();
    }

    async init() {
        await this.loadUserData();
        this.setupEventListeners();
        this.setupModalEventListeners();
    }

    async loadUserData() {
        try {
            const response = await fetch('/api/user');
            const data = await response.json();
            if (data.user) {
                this.currentUser = data.user;
                this.updateUserInfo();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        // Update user info in modals
        const hostNameElements = document.querySelectorAll('#hostName, .user-name');
        hostNameElements.forEach(el => {
            if (el) el.textContent = this.currentUser.name;
        });

        const userAvatarElements = document.querySelectorAll('#userAvatar, .user-avatar');
        userAvatarElements.forEach(el => {
            if (el) {
                if (this.currentUser.profilePicture) {
                    el.innerHTML = `<img src="${this.currentUser.profilePicture}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
                } else {
                    el.textContent = this.getInitials(this.currentUser.name);
                }
            }
        });
    }

    getInitials(name) {
        return name.split(' ').map(part => part[0]).join('').toUpperCase().substring(0, 2);
    }

    setupEventListeners() {
        // Quick action buttons
        const startCallBtn = document.querySelector('.quick-action-btn.primary');
        const shareScreenBtn = document.querySelector('.quick-action-btn.tertiary');
        const joinMeetingBtn = document.querySelector('.quick-action-btn.quaternary');

        if (startCallBtn) {
            startCallBtn.addEventListener('click', () => this.openStartMeetingModal());
        }

        if (shareScreenBtn) {
            shareScreenBtn.addEventListener('click', () => this.openShareScreenModal());
        }

        if (joinMeetingBtn) {
            joinMeetingBtn.addEventListener('click', () => this.openJoinMeetingModal());
        }
    }

    setupModalEventListeners() {
        // Start Meeting Modal
        this.setupStartMeetingModal();
        
        // Share Screen Modal
        this.setupShareScreenModal();
        
        // Join Meeting Modal
        this.setupJoinMeetingModal();
    }

    setupStartMeetingModal() {
        const modal = document.getElementById('ModalPopMeetingOverlay');
        const closeBtn = modal?.querySelector('.close-btn');
        const cancelBtn = modal?.querySelector('.cancel-btn');
        const startBtn = modal?.querySelector('#startMeetingBtn');
        const titleInput = modal?.querySelector('#titleInput');
        const emailInput = modal?.querySelector('#emailInput');
        const addParticipantBtn = modal?.querySelector('.add-email-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeStartMeetingModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeStartMeetingModal());
        if (startBtn) startBtn.addEventListener('click', () => this.createMeeting());
        
        if (titleInput) {
            titleInput.addEventListener('input', () => this.generateMeetingDetails());
        }

        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addParticipant();
                }
            });
        }

        if (addParticipantBtn) {
            addParticipantBtn.addEventListener('click', () => this.addParticipant());
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeStartMeetingModal();
                }
            });
        }
    }

    setupShareScreenModal() {
        const modal = document.getElementById('meetingPopup');
        const closeBtn = modal?.querySelector('#closePopup');
        const startBtn = modal?.querySelector('#startmeetingnoscrn');
        const titleInput = modal?.querySelector('#meetingTitle');
        const emailInput = modal?.querySelector('#emailInputShare');
        const addEmailBtn = modal?.querySelector('#addEmailBtn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeShareScreenModal());
        if (startBtn) startBtn.addEventListener('click', () => this.createScreenShareMeeting());
        
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                this.updateCharacterCount(e.target.value);
                this.generateScreenShareMeetingDetails();
            });
        }

        if (emailInput) {
            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addEmailToScreenShare();
                }
            });
        }

        if (addEmailBtn) {
            addEmailBtn.addEventListener('click', () => this.addEmailToScreenShare());
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeShareScreenModal();
                }
            });
        }
    }

    setupJoinMeetingModal() {
        const modal = document.getElementById('dialogBackdrop');
        const closeBtn = modal?.querySelector('#dismissDialog');
        const cancelBtn = modal?.querySelector('#dismissControl');
        const joinBtn = modal?.querySelector('#launchConferenceBtn');
        const meetingIdInput = modal?.querySelector('#conferenceTitle');

        if (closeBtn) closeBtn.addEventListener('click', () => this.closeJoinMeetingModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeJoinMeetingModal());
        if (joinBtn) joinBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.joinMeeting();
        });

        if (meetingIdInput) {
            // Restrict input to uppercase letters and numbers only
            meetingIdInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/[^A-Z0-9]/g, '');
                if (value.length > 8) {
                    value = value.substring(0, 8);
                }
                e.target.value = value;
            });

            meetingIdInput.addEventListener('keypress', (e) => {
                // Only allow uppercase letters and numbers
                const char = e.key.toUpperCase();
                if (!/[A-Z0-9]/.test(char) && !['Backspace', 'Delete', 'Tab', 'Enter'].includes(e.key)) {
                    e.preventDefault();
                }
                
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.joinMeeting();
                }
            });
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeJoinMeetingModal();
                }
            });
        }
    }

    // Modal opening methods
    openStartMeetingModal() {
        const modal = document.getElementById('ModalPopMeetingOverlay');
        if (modal) {
            modal.classList.add('active');
            this.resetStartMeetingModal();
            this.generateMeetingDetails();
            
            // Focus on title input
            const titleInput = modal.querySelector('#titleInput');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 100);
            }
        }
    }

    openShareScreenModal() {
        const modal = document.getElementById('meetingPopup');
        if (modal) {
            modal.classList.add('active');
            this.resetShareScreenModal();
            this.generateScreenShareMeetingDetails();
            
            // Focus on title input
            const titleInput = modal.querySelector('#meetingTitle');
            if (titleInput) {
                setTimeout(() => titleInput.focus(), 100);
            }
        }
    }

    openJoinMeetingModal() {
        const modal = document.getElementById('dialogBackdrop');
        if (modal) {
            modal.style.display = 'flex';
            this.resetJoinMeetingModal();
            
            // Focus on meeting ID input
            const meetingIdInput = modal.querySelector('#conferenceTitle');
            if (meetingIdInput) {
                setTimeout(() => meetingIdInput.focus(), 100);
            }
        }
    }

    // Modal closing methods
    closeStartMeetingModal() {
        const modal = document.getElementById('ModalPopMeetingOverlay');
        if (modal) {
            modal.classList.remove('active');
            this.resetStartMeetingModal();
        }
    }

    closeShareScreenModal() {
        const modal = document.getElementById('meetingPopup');
        if (modal) {
            modal.classList.remove('active');
            this.resetShareScreenModal();
        }
    }

    closeJoinMeetingModal() {
        const modal = document.getElementById('dialogBackdrop');
        if (modal) {
            modal.style.display = 'none';
            this.resetJoinMeetingModal();
        }
    }

    // Reset modal methods
    resetStartMeetingModal() {
        this.participants = [];
        this.currentMeetingData = null;
        
        const titleInput = document.getElementById('titleInput');
        const emailInput = document.getElementById('emailInput');
        const participantsList = document.getElementById('participantsNameList');
        const participantsCount = document.getElementById('participantsNameCount');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const videoOffCheckbox = document.getElementById('startWithVideoOff');
        const screenShareCheckbox = document.getElementById('autoStartScreenShare');

        if (titleInput) titleInput.value = this.currentUser ? `${this.currentUser.name}'s Meeting` : 'New Meeting';
        if (emailInput) emailInput.value = '';
        if (participantsList) participantsList.innerHTML = '<div class="empty-state" id="emptyState"><i class="fas fa-user-plus"></i><p>No participants added yet.<br>Enter email addresses above to get started.</p></div>';
        if (participantsCount) participantsCount.textContent = '0 participants added';
        if (errorMessage) errorMessage.classList.remove('show');
        if (successMessage) successMessage.classList.remove('show');
        if (videoOffCheckbox) videoOffCheckbox.checked = false;
        if (screenShareCheckbox) screenShareCheckbox.checked = false;

        this.clearMeetingDetails();
    }

    resetShareScreenModal() {
        this.selectedEmails = [];
        this.currentMeetingData = null;
        
        const titleInput = document.getElementById('meetingTitle');
        const emailInput = document.getElementById('emailInputShare');
        const selectedEmailsContainer = document.getElementById('selectedEmails');
        const errorMessage = document.getElementById('errorMessage');

        if (titleInput) {
            titleInput.value = this.currentUser ? `${this.currentUser.name}'s Screen Share` : 'Screen Share Session';
            this.updateCharacterCount(titleInput.value);
        }
        if (emailInput) emailInput.value = '';
        if (selectedEmailsContainer) selectedEmailsContainer.innerHTML = '';
        if (errorMessage) errorMessage.classList.remove('show');

        this.clearScreenShareMeetingDetails();
    }

    resetJoinMeetingModal() {
        const meetingIdInput = document.getElementById('conferenceTitle');
        const errorMessage = document.getElementById('titleError');

        if (meetingIdInput) meetingIdInput.value = '';
        if (errorMessage) errorMessage.textContent = '';
    }

    // Meeting details generation
    generateMeetingDetails() {
        if (!this.currentMeetingData) {
            this.currentMeetingData = {
                id: this.generateMeetingId(),
                url: ''
            };
        }

        const meetingIdDisplay = document.getElementById('meetingIdDisplay');
        const meetingLinkDisplay = document.getElementById('meetingLinkDisplay');

        if (meetingIdDisplay) {
            meetingIdDisplay.value = this.currentMeetingData.id;
        }

        if (meetingLinkDisplay) {
            this.currentMeetingData.url = `${window.location.origin}/join/${this.currentMeetingData.id}`;
            meetingLinkDisplay.value = this.currentMeetingData.url;
        }
    }

    generateScreenShareMeetingDetails() {
        if (!this.currentMeetingData) {
            this.currentMeetingData = {
                id: this.generateMeetingId(),
                url: ''
            };
        }

        const meetingIdDisplay = document.getElementById('meetingIdDisplay');
        const meetingLinkDisplay = document.getElementById('meetingLinkDisplay');

        if (meetingIdDisplay) {
            meetingIdDisplay.value = this.currentMeetingData.id;
        }

        if (meetingLinkDisplay) {
            this.currentMeetingData.url = `${window.location.origin}/join/${this.currentMeetingData.id}`;
            meetingLinkDisplay.value = this.currentMeetingData.url;
        }
    }

    generateMeetingId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    clearMeetingDetails() {
        const meetingIdDisplay = document.getElementById('meetingIdDisplay');
        const meetingLinkDisplay = document.getElementById('meetingLinkDisplay');

        if (meetingIdDisplay) meetingIdDisplay.value = '';
        if (meetingLinkDisplay) meetingLinkDisplay.value = '';
    }

    clearScreenShareMeetingDetails() {
        const meetingIdDisplay = document.getElementById('meetingIdDisplay');
        const meetingLinkDisplay = document.getElementById('meetingLinkDisplay');

        if (meetingIdDisplay) meetingIdDisplay.value = '';
        if (meetingLinkDisplay) meetingLinkDisplay.value = '';
    }

    // Participant management for start meeting modal
    addParticipant() {
        const emailInput = document.getElementById('emailInput');
        const email = emailInput.value.trim();

        if (!email) {
            this.showError('Please enter an email address');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }

        if (this.participants.includes(email)) {
            this.showError('This participant is already added');
            return;
        }

        this.participants.push(email);
        this.renderParticipants();
        emailInput.value = '';
        this.hideError();
    }

    removeParticipant(email) {
        this.participants = this.participants.filter(p => p !== email);
        this.renderParticipants();
    }

    renderParticipants() {
        const participantsList = document.getElementById('participantsNameList');
        const participantsCount = document.getElementById('participantsNameCount');

        if (!participantsList || !participantsCount) return;

        participantsCount.textContent = `${this.participants.length} participant${this.participants.length !== 1 ? 's' : ''} added`;

        if (this.participants.length === 0) {
            participantsList.innerHTML = '<div class="empty-state"><i class="fas fa-user-plus"></i><p>No participants added yet.<br>Enter email addresses above to get started.</p></div>';
            return;
        }

        const html = this.participants.map(email => `
            <div class="participant-item">
                <div class="participant-info">
                    <div class="participant-avatar">${this.getEmailInitials(email)}</div>
                    <div class="participant-email">${email}</div>
                </div>
                <button class="remove-participant" onclick="modalHandler.removeParticipant('${email}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        participantsList.innerHTML = html;
    }

    // Email management for share screen modal
    addEmailToScreenShare() {
        const emailInput = document.getElementById('emailInputShare');
        const email = emailInput.value.trim();

        if (!email) {
            this.showScreenShareError('Please enter an email address');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showScreenShareError('Please enter a valid email address');
            return;
        }

        if (this.selectedEmails.includes(email)) {
            this.showScreenShareError('This email is already added');
            return;
        }

        this.selectedEmails.push(email);
        this.renderSelectedEmails();
        emailInput.value = '';
        this.hideScreenShareError();
    }

    removeEmailFromScreenShare(email) {
        this.selectedEmails = this.selectedEmails.filter(e => e !== email);
        this.renderSelectedEmails();
    }

    renderSelectedEmails() {
        const container = document.getElementById('selectedEmails');
        if (!container) return;

        if (this.selectedEmails.length === 0) {
            container.innerHTML = '';
            return;
        }

        const html = this.selectedEmails.map(email => `
            <div class="email-chip">
                <div class="chip-avatar">${this.getEmailInitials(email)}</div>
                <span class="email-text">${email}</span>
                <button class="remove-chip" onclick="modalHandler.removeEmailFromScreenShare('${email}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    updateCharacterCount(text) {
        const charCount = document.getElementById('characterCount');
        if (charCount) {
            const count = text.length;
            charCount.textContent = `${count}/100 characters`;
            
            if (count > 80) {
                charCount.classList.add('warning');
            } else {
                charCount.classList.remove('warning');
            }
            
            if (count >= 100) {
                charCount.classList.add('danger');
            } else {
                charCount.classList.remove('danger');
            }
        }
    }

    // Meeting creation methods
    async createMeeting() {
        const titleInput = document.getElementById('titleInput');
        const videoOffCheckbox = document.getElementById('startWithVideoOff');
        const screenShareCheckbox = document.getElementById('autoStartScreenShare');
        const startBtn = document.getElementById('startMeetingBtn');

        const title = titleInput?.value.trim() || 'New Meeting';
        const startWithVideoOff = videoOffCheckbox?.checked || false;
        const autoStartScreenShare = screenShareCheckbox?.checked || false;

        if (!title) {
            this.showError('Please enter a meeting title');
            return;
        }

        this.setButtonLoading(startBtn, true);

        try {
            const response = await fetch('/api/create-meeting-with-invites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    meetingName: title,
                    meetingId: this.currentMeetingData?.id,
                    participants: this.participants,
                    options: {
                        startWithVideoOff,
                        autoStartScreenShare
                    }
                })
            });

            const data = await response.json();

            if (response.ok) {
                this.showSuccess('Meeting created successfully! Redirecting...');
                
                // Store meeting options
                sessionStorage.setItem('customMeetingName', title);
                sessionStorage.setItem('fromCreateForm', 'true');
                
                if (startWithVideoOff) {
                    sessionStorage.setItem('autoStopVideo', 'true');
                }

                if (autoStartScreenShare) {
                    sessionStorage.setItem('autoStartScreenShare', 'true');
                }
                setTimeout(() => {
                    let hostUrl = `/host/${data.meetingId}?name=${encodeURIComponent(title)}`;
                    if (autoStartScreenShare) {
                        hostUrl += '&autoScreenShare=true';
                    }
                    window.location.href = hostUrl;
                }, 1500);
            } else {
                throw new Error(data.error || 'Failed to create meeting');
            }
        } catch (error) {
            console.error('Error creating meeting:', error);
            this.showError(error.message);
        } finally {
            this.setButtonLoading(startBtn, false);
        }
    }

    async createScreenShareMeeting() {
        const titleInput = document.getElementById('meetingTitle');
        const startBtn = document.getElementById('startmeetingnoscrn');

        const title = titleInput?.value.trim() || 'Screen Share Session';

        if (!title) {
            this.showScreenShareError('Please enter a meeting title');
            return;
        }

        this.setButtonLoading(startBtn, true);

        try {
            const response = await fetch('/api/create-meeting-with-invites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    meetingName: title,
                    meetingId: this.currentMeetingData?.id,
                    participants: this.selectedEmails,
                    options: {
                        autoStartScreenShare: true,
                        startWithVideoOff: false
                    }
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Store meeting options
                sessionStorage.setItem('customMeetingName', title);
                sessionStorage.setItem('fromCreateForm', 'true');
                sessionStorage.setItem('autoStartScreenShare', 'true');

                const hostUrl = `/host/${data.meetingId}?name=${encodeURIComponent(title)}&autoScreenShare=true`;
                window.location.href = hostUrl;
            } else {
                throw new Error(data.error || 'Failed to create meeting');
            }
        } catch (error) {
            console.error('Error creating screen share meeting:', error);
            this.showScreenShareError(error.message);
        } finally {
            this.setButtonLoading(startBtn, false);
        }
    }

    async joinMeeting() {
        const meetingIdInput = document.getElementById('conferenceTitle');
        const joinBtn = document.getElementById('launchConferenceBtn');
        const errorDiv = document.getElementById('titleError');

        const meetingId = meetingIdInput?.value.trim().toUpperCase();

        if (!meetingId) {
            this.showJoinError('Please enter a meeting ID');
            return;
        }

        if (meetingId.length !== 8) {
            this.showJoinError('Meeting ID must be 8 characters long');
            return;
        }

        this.setButtonLoading(joinBtn, true);

        try {
            const response = await fetch(`/api/meeting/${meetingId}`);
            
            if (response.ok) {
                window.location.href = `/join/${meetingId}`;
            } else if (response.status === 404) {
                throw new Error('Meeting not found. Please check the meeting ID.');
            } else {
                throw new Error('Failed to join meeting. Please try again.');
            }
        } catch (error) {
            console.error('Error joining meeting:', error);
            this.showJoinError(error.message);
        } finally {
            this.setButtonLoading(joinBtn, false);
        }
    }

    // Copy functions
    copyMeetingId() {
        const meetingIdDisplay = document.getElementById('meetingIdDisplay');
        if (meetingIdDisplay && meetingIdDisplay.value) {
            navigator.clipboard.writeText(meetingIdDisplay.value).then(() => {
                this.showToast('Meeting ID copied to clipboard!');
            });
        }
    }

    copyMeetingLink() {
        const meetingLinkDisplay = document.getElementById('meetingLinkDisplay');
        if (meetingLinkDisplay && meetingLinkDisplay.value) {
            navigator.clipboard.writeText(meetingLinkDisplay.value).then(() => {
                this.showToast('Meeting link copied to clipboard!');
            });
        }
    }

    // Utility methods
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    getEmailInitials(email) {
        const name = email.split('@')[0];
        return name.substring(0, 2).toUpperCase();
    }

    setButtonLoading(button, loading) {
        if (!button) return;

        const spinner = button.querySelector('.loading-spinner');
        const icon = button.querySelector('i:not(.loading-spinner i)');
        const text = button.querySelector('#btnText, span');

        if (loading) {
            button.disabled = true;
            if (spinner) spinner.style.display = 'block';
            if (icon) icon.style.display = 'none';
            if (text) text.textContent = 'Creating...';
        } else {
            button.disabled = false;
            if (spinner) spinner.style.display = 'none';
            if (icon) icon.style.display = 'inline';
            if (text) text.textContent = button.id === 'launchConferenceBtn' ? 'Join' : 'Start Meeting';
        }
    }

    // Error and success message methods
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            setTimeout(() => errorMessage.classList.remove('show'), 5000);
        }
    }

    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        if (successMessage) {
            successMessage.textContent = message;
            successMessage.classList.add('show');
            setTimeout(() => successMessage.classList.remove('show'), 3000);
        }
    }

    showScreenShareError(message) {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('show');
            setTimeout(() => errorMessage.classList.remove('show'), 5000);
        }
    }

    hideScreenShareError() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.classList.remove('show');
        }
    }

    showJoinError(message) {
        const errorDiv = document.getElementById('titleError');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    }

    hideError() {
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) {
            errorMessage.classList.remove('show');
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i>
            <span>${message}</span>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : '#ef4444'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize the modal handler
let modalHandler;
document.addEventListener('DOMContentLoaded', () => {
    modalHandler = new DashboardModalHandler();
    
    // Make it globally accessible for onclick handlers
    window.modalHandler = modalHandler;
    window.openModalPopMeeting = () => modalHandler.openStartMeetingModal();
    window.closeModalPopMeeting = () => modalHandler.closeStartMeetingModal();
    window.addParticipant = () => modalHandler.addParticipant();
    window.createMeeting = () => modalHandler.createMeeting();
    window.copyMeetingId = () => modalHandler.copyMeetingId();
    window.copyMeetingLink = () => modalHandler.copyMeetingLink();
    window.handleEmailKeyPress = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            modalHandler.addParticipant();
        }
    };
});