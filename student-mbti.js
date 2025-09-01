class StudentMBTIFormSystem {
    constructor() {
        this.currentStudentId = this.generateStudentId();
        this.initializeEventListeners();
        this.checkExistingSubmission();
        this.checkGroupAssignment();
        this.initializeFirebaseGroupListener();
    }

    generateStudentId() {
        // Generate a unique ID based on timestamp and random number
        return 'student_mbti_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }



    initializeEventListeners() {
        const mbtiForm = document.getElementById('mbtiForm');
        const clearFormBtn = document.getElementById('clearForm');
        const editInfoBtn = document.getElementById('editInfo');
        const mbtiTypeSelect = document.getElementById('mbtiType');

        mbtiForm.addEventListener('submit', (e) => this.handleMBTISubmit(e));
        clearFormBtn.addEventListener('click', () => this.clearForm());
        
        if (editInfoBtn) {
            editInfoBtn.addEventListener('click', () => this.enableEditing());
        }

        // Auto-fill dimensions when MBTI type is selected
        mbtiTypeSelect.addEventListener('change', () => this.updateMBTIDimensions());

        // Real-time validation
        this.setupRealTimeValidation();
    }

    updateMBTIDimensions() {
        // This function is no longer needed since we removed the dimension fields
        // Dimensions will be calculated directly from MBTI type in getMBTIDimensions()
    }

    getMBTIDimensions(mbtiType) {
        if (mbtiType && mbtiType.length === 4) {
            const [e_i, s_n, t_f, j_p] = mbtiType.split('');
            return {
                energyDirection: e_i,
                informationProcessing: s_n,
                decisionMaking: t_f,
                lifestyleApproach: j_p
            };
        }
        return {
            energyDirection: '',
            informationProcessing: '',
            decisionMaking: '',
            lifestyleApproach: ''
        };
    }

    setupRealTimeValidation() {
        const nameInput = document.getElementById('studentName');
        nameInput.addEventListener('input', () => this.validateName());
    }

    validateName() {
        const nameInput = document.getElementById('studentName');
        const name = nameInput.value.trim();
        
        if (name.length > 0 && name.length < 2) {
            this.showInputError(nameInput, 'Name must be at least 2 characters');
            return false;
        } else {
            this.clearInputError(nameInput);
            return true;
        }
    }

    showInputError(input, message) {
        input.style.borderColor = '#e53e3e';
        input.style.backgroundColor = '#fed7d7';
        
        // Remove previous error message
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Add new error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = '#e53e3e';
        errorDiv.style.fontSize = '0.9rem';
        errorDiv.style.marginTop = '5px';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
    }

    clearInputError(input) {
        input.style.borderColor = '#e2e8f0';
        input.style.backgroundColor = '#fafafa';
        
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
    }

    handleMBTISubmit(e) {
        e.preventDefault();
        
        const mbtiType = document.getElementById('mbtiType').value;
        const studentData = {
            id: this.currentStudentId,
            name: document.getElementById('studentName').value.trim(),
            mbtiType: mbtiType,
            mbtiDimensions: this.getMBTIDimensions(mbtiType),
            mbtiConfidence: document.getElementById('mbtiConfidence').value,
            personalityDescription: document.getElementById('personalityDescription') ? 
                document.getElementById('personalityDescription').value.trim() : '',
            submitTime: new Date().toISOString(),
            dataType: 'mbti'
        };

        // Validate data
        if (!this.validateMBTIData(studentData)) {
            return;
        }

        // Show submitting status
        this.showStatusMessage('Submitting your MBTI information...', 'info');
        
        // Try to submit to Firebase
        this.submitToFirebase(studentData);
    }

    validateMBTIData(data) {
        // Validate name
        if (!data.name || data.name.length < 2) {
            this.showStatusMessage('Please enter a valid name (at least 2 characters)', 'error');
            return false;
        }

        // Validate MBTI type
        if (!data.mbtiType || data.mbtiType === '') {
            this.showStatusMessage('Please select your MBTI personality type', 'error');
            return false;
        }

        // Check if a student with the same name already exists
        const existingStudents = this.getAllStudents();
        const nameExists = existingStudents.some(student => 
            student.name.toLowerCase() === data.name.toLowerCase() && student.id !== data.id
        );

        if (nameExists) {
            this.showStatusMessage('This name is already taken, please use a different name', 'error');
            return false;
        }

        return true;
    }

    async submitToFirebase(studentData) {
        try {
            // First initialize Firebase
            const firebaseReady = await window.firebaseService.initialize();
            
            if (firebaseReady) {
                // Check for duplicate first
                const existingStudent = await window.firebaseService.checkDuplicateStudentMBTI(studentData.name);
                
                if (existingStudent) {
                    // Show duplicate confirmation dialog
                    this.showDuplicateConfirmation(studentData, existingStudent);
                    return;
                }
                
                // Submit to Firebase (new student)
                const result = await window.firebaseService.submitStudentMBTI(studentData);
                
                // Also save to local storage as backup
                this.saveStudentData(studentData);
                
                // Show success message
                this.showFirebaseSuccessMessage(studentData, result.firebaseId, result.isNew);
                this.disableForm();
                
            } else {
                // Firebase not configured or failed, save locally only
                console.log('Firebase not available, saving locally only');
                if (this.saveStudentData(studentData)) {
                    this.showSuccessMessage(studentData);
                    this.disableForm();
                } else {
                    this.showStatusMessage('Submission failed. Please try again.', 'error');
                }
            }
            
        } catch (error) {
            console.error('Firebase submission failed:', error);
            
            // If Firebase fails, still save locally
            if (this.saveStudentData(studentData)) {
                this.showStatusMessage('Information saved locally. Cloud sync will retry automatically.', 'warning');
                this.disableForm();
            } else {
                this.showStatusMessage('Submission failed. Please try again.', 'error');
            }
        }
    }

    showDuplicateConfirmation(newData, existingData) {
        const modal = document.createElement('div');
        modal.className = 'duplicate-modal';
        modal.innerHTML = `
            <div class="duplicate-modal-content">
                <div class="duplicate-header">
                                    <h3>⚠️ Duplicate Submission Detected</h3>
                <p>The system found an existing MBTI record with the same name</p>
                </div>
                
                <div class="duplicate-comparison">
                    <div class="existing-data">
                        <h4>📋 Existing Record</h4>
                        <p><strong>Name:</strong> ${existingData.name}</p>
                        <p><strong>MBTI Type:</strong> ${existingData.mbtiType || 'None'}</p>
                                            <p><strong>Submission Time:</strong> ${new Date(existingData.submitTime).toLocaleString()}</p>
                    ${existingData.updateCount > 0 ? `<p><strong>Update Count:</strong> ${existingData.updateCount}</p>` : ''}
                    </div>
                    
                    <div class="new-data">
                        <h4>✏️ New Submission Content</h4>
                        <p><strong>Name:</strong> ${newData.name}</p>
                        <p><strong>MBTI Type:</strong> ${newData.mbtiType || 'None'}</p>
                    </div>
                </div>
                
                <div class="duplicate-actions">
                    <button class="btn-update" onclick="studentMBTIFormSystem.handleDuplicateUpdate('${JSON.stringify(newData).replace(/'/g, "\\'")}')">
                        🔄 Update Existing Record
                    </button>
                    <button class="btn-cancel" onclick="studentMBTIFormSystem.closeDuplicateModal()">
                        ❌ Cancel Submission
                    </button>
                </div>
                
                <div class="duplicate-note">
                    <p><small>💡 Choose "Update Existing Record" to overwrite previous MBTI information, or "Cancel Submission" to modify the current form content.</small></p>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listener to close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeDuplicateModal();
            }
        });
    }

    async handleDuplicateUpdate(newDataStr) {
        try {
            const newData = JSON.parse(newDataStr);
            
            // Submit with update permission
            const result = await window.firebaseService.submitStudentMBTI(newData, true);
            
            // Also save to local storage as backup
            this.saveStudentData(newData);
            
            // Show success message
            this.showFirebaseSuccessMessage(newData, result.firebaseId, result.isUpdate, result.updateCount);
            this.disableForm();
            this.closeDuplicateModal();
            
        } catch (error) {
            console.error('Update submission failed:', error);
            this.showStatusMessage('Update failed, please try again', 'error');
        }
    }

    closeDuplicateModal() {
        const modal = document.querySelector('.duplicate-modal');
        if (modal) {
            modal.remove();
        }
    }

    showFirebaseSuccessMessage(studentData, firebaseId, isUpdate = false, updateCount = 0) {
        const mbtiTypeDescription = this.getMBTITypeDescription(studentData.mbtiType);
        
        const message = `
            <div class="success-content">
                <h3>🎉 ${isUpdate ? 'MBTI Information Updated Successfully!' : 'MBTI Information Submitted Successfully!'}</h3>
                <p><strong>Name:</strong> ${studentData.name}</p>
                <p><strong>MBTI Type:</strong> ${studentData.mbtiType} - ${mbtiTypeDescription}</p>
                <p><strong>Confidence Level:</strong> ${this.getConfidenceText(studentData.mbtiConfidence)}</p>
                ${studentData.personalityDescription ? `<p><strong>Description:</strong> ${studentData.personalityDescription}</p>` : ''}
                ${isUpdate ? `<p><strong>Update Count:</strong> ${updateCount}</p>` : ''}
                <p class="success-note">✅ Your MBTI information has been successfully ${isUpdate ? 'updated' : 'submitted'}!</p>
            </div>
        `;
        
        this.showStatusMessage(message, 'success');
    }

    getMBTITypeDescription(mbtiType) {
        const descriptions = {
            'INTJ': 'Architect',
            'INTP': 'Thinker',
            'ENTJ': 'Commander',
            'ENTP': 'Debater',
            'INFJ': 'Advocate',
            'INFP': 'Mediator',
            'ENFJ': 'Protagonist',
            'ENFP': 'Campaigner',
            'ISTJ': 'Logistician',
            'ISFJ': 'Defender',
            'ESTJ': 'Executive',
            'ESFJ': 'Consul',
            'ISTP': 'Virtuoso',
            'ISFP': 'Adventurer',
            'ESTP': 'Entrepreneur',
            'ESFP': 'Entertainer'
        };
        return descriptions[mbtiType] || 'Unknown';
    }

    getConfidenceText(confidence) {
        const texts = {
            'high': 'Very confident',
            'medium': 'Moderately confident',
            'low': 'Not very confident'
        };
        return texts[confidence] || confidence;
    }

    saveStudentData(studentData) {
        try {
            const existingStudents = this.getAllStudents();
            
            // Check if updating existing student information
            const existingIndex = existingStudents.findIndex(student => student.id === studentData.id);
            
            if (existingIndex !== -1) {
                // Update existing student
                existingStudents[existingIndex] = studentData;
            } else {
                // Add new student
                existingStudents.push(studentData);
            }
            
            localStorage.setItem('studentsMBTIData', JSON.stringify(existingStudents));
            
            // Also save current student ID to localStorage for state recovery after page refresh
            localStorage.setItem('currentMBTIStudentId', this.currentStudentId);
            
            return true;
        } catch (error) {
            console.error('Error saving student MBTI data:', error);
            return false;
        }
    }

    getAllStudents() {
        try {
            const studentsData = localStorage.getItem('studentsMBTIData');
            return studentsData ? JSON.parse(studentsData) : [];
        } catch (error) {
            console.error('Error reading student MBTI data:', error);
            return [];
        }
    }

    checkExistingSubmission() {
        // Check if there's a submission record for current student ID in localStorage
        const savedStudentId = localStorage.getItem('currentMBTIStudentId');
        if (savedStudentId) {
            this.currentStudentId = savedStudentId;
            
            const existingStudents = this.getAllStudents();
            const currentStudent = existingStudents.find(student => student.id === this.currentStudentId);
            
            if (currentStudent) {
                this.showExistingSubmission(currentStudent);
                return;
            }
        }
        
        // If no existing submission, show default state
        this.showStatusMessage('Please fill in complete information before submitting', 'default');
    }

    showExistingSubmission(studentData) {
        // Fill the form
        document.getElementById('studentName').value = studentData.name;
        document.getElementById('mbtiType').value = studentData.mbtiType;
        document.getElementById('mbtiConfidence').value = studentData.mbtiConfidence || 'medium';
        
        // Only fill personality description if the field exists
        const personalityField = document.getElementById('personalityDescription');
        if (personalityField) {
            personalityField.value = studentData.personalityDescription || '';
        }

        // Show submission status
        this.showSuccessMessage(studentData);
        this.disableForm();
    }

    showSuccessMessage(studentData) {
        const alreadySubmitted = document.getElementById('alreadySubmitted');
        const submittedInfo = document.getElementById('submittedInfo');
        
        const submitDate = new Date(studentData.submitTime);
        const formattedDate = submitDate.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const mbtiTypeDescription = this.getMBTITypeDescription(studentData.mbtiType);

        submittedInfo.innerHTML = `
            <div class="info-item">
                <div class="info-label">Name:</div>
                <div class="info-value">${studentData.name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">MBTI Type:</div>
                <div class="info-value">
                    <span class="mbti-badge">${studentData.mbtiType}</span>
                    <span class="mbti-description">${mbtiTypeDescription}</span>
                </div>
            </div>

            <div class="info-item">
                <div class="info-label">Confidence:</div>
                <div class="info-value">${this.getConfidenceText(studentData.mbtiConfidence)}</div>
            </div>
            ${studentData.personalityDescription ? `
            <div class="info-item">
                <div class="info-label">Description:</div>
                <div class="info-value">${studentData.personalityDescription}</div>
            </div>
            ` : ''}
            <div class="info-item">
                <div class="info-label">Submission Time:</div>
                <div class="info-value">${formattedDate}</div>
            </div>
        `;

        this.showStatusMessage('MBTI information submitted successfully!', 'success');
        alreadySubmitted.style.display = 'block';
    }

    disableForm() {
        const form = document.getElementById('mbtiForm');
        const inputs = form.querySelectorAll('input, select, textarea');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        inputs.forEach(input => {
            input.disabled = true;
            input.style.backgroundColor = '#f7fafc';
            input.style.color = '#718096';
        });
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitted';
        submitBtn.style.background = '#cbd5e0';
        submitBtn.style.cursor = 'not-allowed';
    }

    enableEditing() {
        const form = document.getElementById('mbtiForm');
        const inputs = form.querySelectorAll('input, select, textarea');
        const submitBtn = form.querySelector('button[type="submit"]');
        const alreadySubmitted = document.getElementById('alreadySubmitted');
        
        inputs.forEach(input => {
            input.disabled = false;
            input.style.backgroundColor = '#fafafa';
            input.style.color = '#333';
        });
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update MBTI Information';
        submitBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        submitBtn.style.cursor = 'pointer';
        
        alreadySubmitted.style.display = 'none';
        this.showStatusMessage('You can modify information and resubmit', 'default');
    }

    clearForm() {
        if (confirm('Are you sure you want to clear all filled information?')) {
            document.getElementById('mbtiForm').reset();
            this.clearStatusMessage();
            
            // Generate new student ID
            this.currentStudentId = this.generateStudentId();
            
            // Enable form
            this.enableForm();
            
            // Hide submitted information
            document.getElementById('alreadySubmitted').style.display = 'none';
            
            this.showStatusMessage('Form cleared, please fill again', 'default');
        }
    }

    enableForm() {
        const form = document.getElementById('mbtiForm');
        const inputs = form.querySelectorAll('input, select, textarea');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        inputs.forEach(input => {
            input.disabled = false;
            input.style.backgroundColor = '#fafafa';
            input.style.color = '#333';
        });
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit MBTI Information';
        submitBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        submitBtn.style.cursor = 'pointer';
    }

    showStatusMessage(message, type = 'default') {
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.innerHTML = `<p>${message}</p>`;
        
        // Reset all style classes
        statusMessage.className = 'status-message';
        
        if (type === 'success') {
            statusMessage.classList.add('success');
        } else if (type === 'error') {
            statusMessage.classList.add('error');
        }
    }

    clearStatusMessage() {
        const statusMessage = document.getElementById('statusMessage');
        statusMessage.className = 'status-message';
        statusMessage.innerHTML = '<p>Please fill in complete information before submitting</p>';
    }

    async checkGroupAssignment() {
        try {
            // Get current student data
            const currentStudentId = localStorage.getItem('currentMBTIStudentId') || this.currentStudentId;
            const studentsData = localStorage.getItem('studentsMBTIData');
            
            if (!studentsData) {
                this.hideGroupAssignment();
                return;
            }

            const allStudents = JSON.parse(studentsData);
            const currentStudent = allStudents.find(student => student.id === currentStudentId);
            
            if (!currentStudent) {
                this.hideGroupAssignment();
                return;
            }

            // Try to get groups from Firebase first, then fallback to localStorage
            let groups = null;
            
            try {
                if (window.firebaseService && window.firebaseService.initialized) {
                    const firebaseGroups = await window.firebaseService.getMBTIGroupAssignments();
                    if (firebaseGroups && firebaseGroups.groups) {
                        groups = firebaseGroups.groups;
                        console.log('Loaded MBTI group assignments from Firebase');
                    }
                }
            } catch (error) {
                console.log('Failed to load from Firebase, trying localStorage:', error.message);
            }
            
            // Fallback to localStorage if Firebase fails
            if (!groups) {
                const groupsData = localStorage.getItem('mbtiGroupAssignments');
                if (!groupsData) {
                    this.hideGroupAssignment();
                    return;
                }
                groups = JSON.parse(groupsData);
                console.log('Loaded MBTI group assignments from localStorage');
            }
            
            // Find which group the current student belongs to
            let studentGroup = null;
            let groupIndex = -1;
            
            for (let i = 0; i < groups.length; i++) {
                const group = groups[i];
                if (group.some(member => member.id === currentStudent.id)) {
                    studentGroup = group;
                    groupIndex = i;
                    break;
                }
            }

            if (studentGroup) {
                this.displayGroupAssignment(studentGroup, groupIndex + 1, currentStudent);
            } else {
                this.hideGroupAssignment();
            }
        } catch (error) {
            console.error('Error checking MBTI group assignment:', error);
            this.hideGroupAssignment();
        }
    }

    displayGroupAssignment(group, groupNumber, currentStudent) {
        const groupAssignmentSection = document.getElementById('groupAssignment');
        const groupInfoDiv = document.getElementById('groupInfo');

        // Sort group members by name
        const sortedGroup = [...group].sort((a, b) => a.name.localeCompare(b.name));

        groupInfoDiv.innerHTML = `
            <div class="group-header">
                <div class="group-number">Group ${groupNumber}</div>
                <div class="group-description">You have been assigned to Group ${groupNumber} based on MBTI compatibility with ${group.length - 1} other ${group.length === 2 ? 'student' : 'students'}</div>
            </div>
            <div class="group-members">
                <h3>Group Members (${group.length} students)</h3>
                <ul class="member-list">
                    ${sortedGroup.map(member => `
                        <li class="member-item ${member.id === currentStudent.id ? 'current-student' : ''}">
                            <div class="member-info">
                                <span class="member-name">${member.name}</span>
                                <span class="member-mbti">${member.mbtiType}</span>
                                <span class="member-badge">${member.id === currentStudent.id ? 'You' : 'Teammate'}</span>
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;

        groupAssignmentSection.style.display = 'block';
    }

    hideGroupAssignment() {
        const groupAssignmentSection = document.getElementById('groupAssignment');
        const groupInfoDiv = document.getElementById('groupInfo');
        
        groupInfoDiv.innerHTML = `
            <div class="no-group-info">
                <h3>No Group Assignment Yet</h3>
                <p>Your teacher hasn't created MBTI-based groups yet. Please check back later.</p>
            </div>
        `;
        
        groupAssignmentSection.style.display = 'none';
    }

    async initializeFirebaseGroupListener() {
        try {
            // Initialize Firebase if not already done
            if (window.firebaseService && !window.firebaseService.initialized) {
                await window.firebaseService.initialize();
            }
            
            // Set up real-time listener for MBTI group assignments
            if (window.firebaseService && window.firebaseService.initialized) {
                this.groupListenerId = window.firebaseService.onMBTIGroupAssignmentsChange((groupData) => {
                    console.log('MBTI group assignments updated from Firebase');
                    this.checkGroupAssignment(); // Refresh group display
                });
                console.log('Firebase MBTI group listener initialized');
            } else {
                // Fallback to polling if Firebase is not available
                console.log('Firebase not available, using polling for MBTI group updates');
                this.startGroupAssignmentPolling();
            }
        } catch (error) {
            console.error('Failed to initialize Firebase MBTI group listener:', error);
            // Fallback to polling
            this.startGroupAssignmentPolling();
        }
    }

    startGroupAssignmentPolling() {
        // Check for group assignment updates every 10 seconds (fallback method)
        setInterval(() => {
            this.checkGroupAssignment();
        }, 10000);
    }
}

// Initialize system after page load
document.addEventListener('DOMContentLoaded', () => {
    window.studentMBTIFormSystem = new StudentMBTIFormSystem();
    
    // Add some user experience enhancements
    addFormEnhancements();
});

function addFormEnhancements() {
    // Add animation effects to input fields
    const inputs = document.querySelectorAll('input[type="text"], select, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (!input.disabled) {
                input.parentNode.style.transform = 'translateY(-2px)';
                input.parentNode.style.transition = 'transform 0.3s ease';
            }
        });
        
        input.addEventListener('blur', () => {
            input.parentNode.style.transform = 'translateY(0)';
        });
    });

    // Add keyboard shortcut support
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter to submit form
        if (e.ctrlKey && e.key === 'Enter') {
            const submitBtn = document.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                submitBtn.click();
            }
        }
        
        // Ctrl+R to clear form
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            const clearBtn = document.getElementById('clearForm');
            if (clearBtn) {
                clearBtn.click();
            }
        }
    });

    // Add form auto-save functionality (draft)
    let saveTimeout;
    const formInputs = document.querySelectorAll('#mbtiForm input, #mbtiForm select, #mbtiForm textarea');
    
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                saveDraft();
            }, 2000); // Auto-save draft after 2 seconds
        });
    });
}

function saveDraft() {
    const personalityField = document.getElementById('personalityDescription');
    const draftData = {
        name: document.getElementById('studentName').value,
        mbtiType: document.getElementById('mbtiType').value,
        mbtiConfidence: document.getElementById('mbtiConfidence').value,
        personalityDescription: personalityField ? personalityField.value : '',
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('studentMBTIFormDraft', JSON.stringify(draftData));
}

function loadDraft() {
    try {
        const draftData = localStorage.getItem('studentMBTIFormDraft');
        if (draftData) {
            const draft = JSON.parse(draftData);
            
            // Only load draft when form is empty
            const isEmpty = document.getElementById('studentName').value === '' &&
                          document.getElementById('mbtiType').value === '';
            
            if (isEmpty) {
                document.getElementById('studentName').value = draft.name || '';
                document.getElementById('mbtiType').value = draft.mbtiType || '';
                document.getElementById('mbtiConfidence').value = draft.mbtiConfidence || 'medium';
                
                const personalityField = document.getElementById('personalityDescription');
                if (personalityField) {
                    personalityField.value = draft.personalityDescription || '';
                }
                
                if (draft.name || draft.mbtiType || draft.personalityDescription) {
                    console.log('MBTI form draft loaded');
                }
            }
        }
    } catch (error) {
        console.error('Error loading MBTI draft:', error);
    }
}

// Try to load draft on page load
window.addEventListener('load', () => {
    setTimeout(loadDraft, 500); // Delayed loading to ensure other initialization is complete
});
