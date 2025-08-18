
    function updateMeetingCount() {
    // Get the meetings container
    const meetingsContainer = document.getElementById('meetingsContainer');
    
    if (!meetingsContainer) return;
    
    // Count all meeting cards within the container
    const meetingCards = meetingsContainer.querySelectorAll('.meeting-card');
    const meetingCount = meetingCards.length;
    
    // Update the stat number element
    const meetingScheduledElement = document.getElementById('meetingScheduledNo');
    if (meetingScheduledElement) {
        meetingScheduledElement.textContent = meetingCount;
    }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Set up observer to watch for meetings being loaded
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                // Check if meeting cards were added or removed
                const hasChanges = Array.from(mutation.addedNodes).some(node => 
                    node.nodeType === 1 && (node.classList.contains('meeting-card') || 
                    node.querySelector && node.querySelector('.meeting-card'))
                ) || Array.from(mutation.removedNodes).some(node => 
                    node.nodeType === 1 && (node.classList.contains('meeting-card') || 
                    node.querySelector && node.querySelector('.meeting-card'))
                );
                
                if (hasChanges) {
                    updateMeetingCount();
                }
            }
        });
    });

    // Observe changes to the meetings container
    const meetingsContainer = document.getElementById('meetingsContainer');
    if (meetingsContainer) {
        observer.observe(meetingsContainer, {
            childList: true,
            subtree: true
        });
        
        // Initial count (in case meetings are already loaded)
        updateMeetingCount();
    }
    
    // Also observe the loading container to detect when meetings finish loading
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        const loadingObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    // If loading container is hidden, meetings might have loaded
                    if (loadingContainer.style.display === 'none') {
                        setTimeout(updateMeetingCount, 100); // Small delay to ensure DOM is updated
                    }
                }
            });
        });
        
        loadingObserver.observe(loadingContainer, {
            attributes: true,
            attributeFilter: ['style']
        });
    }
});
