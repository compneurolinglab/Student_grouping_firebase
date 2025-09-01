class StudentFormSystem {
    constructor() {
        this.currentStudentId = this.generateStudentId();
        this.initializeEventListeners();
        this.checkExistingSubmission();
        this.checkGroupAssignment();
        this.initializeFirebaseGroupListener();
        this.initializeBirthDateSelector();
    }

    generateStudentId() {
        // Generate a unique ID based on timestamp and random number
        return 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    initializeBirthDateSelector() {
        const monthSelect = document.getElementById('birthMonth');
        const daySelect = document.getElementById('birthDay');
        
        // Add event listener for month selector
        monthSelect.addEventListener('change', () => this.updateDayOptions());
        
        // Initialize date options
        this.updateDayOptions();
    }

    updateDayOptions() {
        const monthSelect = document.getElementById('birthMonth');
        const daySelect = document.getElementById('birthDay');
        const selectedMonth = monthSelect.value;
        
        // Clear existing date options
        daySelect.innerHTML = '<option value="">Day</option>';
        
        if (!selectedMonth) return;
        
        // Set number of days based on selected month
        const daysInMonth = this.getDaysInMonth(selectedMonth);
        
        for (let day = 1; day <= daysInMonth; day++) {
            const option = document.createElement('option');
            option.value = day.toString().padStart(2, '0');
            option.textContent = day;
            daySelect.appendChild(option);
        }
    }

    getDaysInMonth(month) {
        const monthNum = parseInt(month);
        if ([1, 3, 5, 7, 8, 10, 12].includes(monthNum)) {
            return 31;
        } else if ([4, 6, 9, 11].includes(monthNum)) {
            return 30;
        } else {
            return 29; // February, including leap year
        }
    }

    getBirthDate() {
        const month = document.getElementById('birthMonth').value;
        const day = document.getElementById('birthDay').value;
        
        if (!month || !day) {
            return null;
        }
        
        return {
            month: month,
            day: day,
            formatted: `${month}-${day}`
        };
    }

    formatBirthDate(birthDate) {
        if (!birthDate || !birthDate.month || !birthDate.day) {
            return 'Not specified';
        }
        
        const monthNames = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const monthNum = parseInt(birthDate.month);
        const dayNum = parseInt(birthDate.day);
        
        return `${monthNames[monthNum]} ${dayNum}`;
    }

    initializeEventListeners() {
        const studentForm = document.getElementById('studentForm');
        const clearFormBtn = document.getElementById('clearForm');
        const editInfoBtn = document.getElementById('editInfo');

        studentForm.addEventListener('submit', (e) => this.handleStudentSubmit(e));
        clearFormBtn.addEventListener('click', () => this.clearForm());
        
        if (editInfoBtn) {
            editInfoBtn.addEventListener('click', () => this.enableEditing());
        }

        // Real-time validation
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        const interests = ['interest1', 'interest2', 'interest3', 'interest4', 'interest5'];
        
        interests.forEach(interestId => {
            const input = document.getElementById(interestId);
            input.addEventListener('input', () => this.validateInterests());
        });

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

    validateInterests() {
        const interests = this.getInterests();
        const filledInterests = interests.filter(interest => interest.trim() !== '');
        
        // Check for duplicates
        const uniqueInterests = new Set(filledInterests.map(interest => interest.toLowerCase()));
        
        if (filledInterests.length > 0 && uniqueInterests.size !== filledInterests.length) {
            this.showStatusMessage('Please ensure all interests are different', 'error');
            return false;
        } else if (filledInterests.length > 0) {
            this.clearStatusMessage();
            return true;
        }
        
        return true;
    }

    getInterests() {
        return [
            document.getElementById('interest1').value.trim(),
            document.getElementById('interest2').value.trim(),
            document.getElementById('interest3').value.trim(),
            document.getElementById('interest4').value.trim(),
            document.getElementById('interest5').value.trim()
        ];
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

    handleStudentSubmit(e) {
        e.preventDefault();
        
        const studentData = {
            id: this.currentStudentId,
            name: document.getElementById('studentName').value.trim(),
            birthDate: this.getBirthDate(),
            interests: this.getInterests(),
            submitTime: new Date().toISOString()
        };

        // Validate data
        if (!this.validateStudentData(studentData)) {
            return;
        }

        // Show submitting status
        this.showStatusMessage('Submitting your information...', 'info');
        
        // Try to submit to Firebase
        this.submitToFirebase(studentData);
    }

    validateStudentData(data) {
        // Validate name
        if (!data.name || data.name.length < 2) {
            this.showStatusMessage('Please enter a valid name (at least 2 characters)', 'error');
            return false;
        }

        // Validate birth date
        if (!data.birthDate || !data.birthDate.month || !data.birthDate.day) {
            this.showStatusMessage('Please select both month and day', 'error');
            return false;
        }

        // Validate interests
        const validInterests = data.interests.filter(interest => interest !== '');
        if (validInterests.length !== 5) {
            this.showStatusMessage('Please fill in all 5 interests/hobbies', 'error');
            return false;
        }

        // Check if interests are duplicated
        const uniqueInterests = new Set(validInterests.map(interest => interest.toLowerCase()));
        if (uniqueInterests.size !== validInterests.length) {
            this.showStatusMessage('Please ensure all 5 interests are different', 'error');
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
                // Submit to Firebase
                const firebaseId = await window.firebaseService.submitStudent(studentData);
                
                // Also save to local storage as backup
                this.saveStudentData(studentData);
                
                // Show success message
                this.showFirebaseSuccessMessage(studentData, firebaseId);
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

    showFirebaseSuccessMessage(studentData, firebaseId) {
        const message = `
            <div class="success-content">
                <h3>🎉 Submission Successful!</h3>
                <p><strong>Name:</strong> ${studentData.name}</p>
                <p><strong>Birthday:</strong> ${this.getMonthName(studentData.birthDate.month)} ${studentData.birthDate.day}</p>
                <p><strong>Interests:</strong> ${studentData.interests.join(', ')}</p>
                <p class="success-note">✅ Your information has been successfully submitted!</p>
            </div>
        `;
        
        this.showStatusMessage(message, 'success');
    }

    getMonthName(monthNumber) {
        const months = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[parseInt(monthNumber)] || '';
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
            
            localStorage.setItem('studentsData', JSON.stringify(existingStudents));
            
            // Also save current student ID to localStorage for state recovery after page refresh
            localStorage.setItem('currentStudentId', this.currentStudentId);
            
            return true;
        } catch (error) {
            console.error('Error saving student data:', error);
            return false;
        }
    }

    getAllStudents() {
        try {
            const studentsData = localStorage.getItem('studentsData');
            return studentsData ? JSON.parse(studentsData) : [];
        } catch (error) {
            console.error('Error reading student data:', error);
            return [];
        }
    }

    checkExistingSubmission() {
        // Check if there's a submission record for current student ID in localStorage
        const savedStudentId = localStorage.getItem('currentStudentId');
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
        if (studentData.birthDate && studentData.birthDate.month && studentData.birthDate.day) {
            document.getElementById('birthMonth').value = studentData.birthDate.month;
            document.getElementById('birthDay').value = studentData.birthDate.day;
            this.updateDayOptions();
        }
        
        studentData.interests.forEach((interest, index) => {
            document.getElementById(`interest${index + 1}`).value = interest;
        });

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

        submittedInfo.innerHTML = `
            <div class="info-item">
                <div class="info-label">Name:</div>
                <div class="info-value">${studentData.name}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Birth Date:</div>
                <div class="info-value">${this.formatBirthDate(studentData.birthDate)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Interests:</div>
                <div class="info-value">
                    <div class="interest-tags">
                        ${studentData.interests.map(interest => 
                            `<span class="interest-tag">${interest}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            <div class="info-item">
                <div class="info-label">Submission Time:</div>
                <div class="info-value">${formattedDate}</div>
            </div>
        `;

        this.showStatusMessage('Information submitted successfully!', 'success');
        alreadySubmitted.style.display = 'block';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    disableForm() {
        const form = document.getElementById('studentForm');
        const inputs = form.querySelectorAll('input');
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
        const form = document.getElementById('studentForm');
        const inputs = form.querySelectorAll('input');
        const submitBtn = form.querySelector('button[type="submit"]');
        const alreadySubmitted = document.getElementById('alreadySubmitted');
        
        inputs.forEach(input => {
            input.disabled = false;
            input.style.backgroundColor = '#fafafa';
            input.style.color = '#333';
        });
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Information';
        submitBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        submitBtn.style.cursor = 'pointer';
        
        alreadySubmitted.style.display = 'none';
        this.showStatusMessage('You can modify information and resubmit', 'default');
    }

    clearForm() {
        if (confirm('Are you sure you want to clear all filled information?')) {
            document.getElementById('studentForm').reset();
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
        const form = document.getElementById('studentForm');
        const inputs = form.querySelectorAll('input');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        inputs.forEach(input => {
            input.disabled = false;
            input.style.backgroundColor = '#fafafa';
            input.style.color = '#333';
        });
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Information';
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
            const currentStudentId = localStorage.getItem('currentStudentId') || this.currentStudentId;
            const studentsData = localStorage.getItem('studentsData');
            
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
                    const firebaseGroups = await window.firebaseService.getGroupAssignments();
                    if (firebaseGroups && firebaseGroups.groups) {
                        groups = firebaseGroups.groups;
                        console.log('Loaded group assignments from Firebase');
                    }
                }
            } catch (error) {
                console.log('Failed to load from Firebase, trying localStorage:', error.message);
            }
            
            // Fallback to localStorage if Firebase fails
            if (!groups) {
                const groupsData = localStorage.getItem('groupAssignments');
                if (!groupsData) {
                    this.hideGroupAssignment();
                    return;
                }
                groups = JSON.parse(groupsData);
                console.log('Loaded group assignments from localStorage');
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
            console.error('Error checking group assignment:', error);
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
                <div class="group-description">You have been assigned to Group ${groupNumber} with ${group.length - 1} other ${group.length === 2 ? 'student' : 'students'}</div>
            </div>
            <div class="group-members">
                <h3>Group Members (${group.length} students)</h3>
                <ul class="member-list">
                    ${sortedGroup.map(member => `
                        <li class="member-item ${member.id === currentStudent.id ? 'current-student' : ''}">
                            <span class="member-name">${member.name}</span>
                            <span class="member-badge">${member.id === currentStudent.id ? 'You' : 'Teammate'}</span>
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
                <p>Your teacher hasn't created groups yet. Please check back later.</p>
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
            
            // Set up real-time listener for group assignments
            if (window.firebaseService && window.firebaseService.initialized) {
                this.groupListenerId = window.firebaseService.onGroupAssignmentsChange((groupData) => {
                    console.log('Group assignments updated from Firebase');
                    this.checkGroupAssignment(); // Refresh group display
                });
                console.log('Firebase group listener initialized');
            } else {
                // Fallback to polling if Firebase is not available
                console.log('Firebase not available, using polling for group updates');
                this.startGroupAssignmentPolling();
            }
        } catch (error) {
            console.error('Failed to initialize Firebase group listener:', error);
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
    window.studentFormSystem = new StudentFormSystem();
    
    // Add some user experience enhancements
    addFormEnhancements();
});

function addFormEnhancements() {
    // Add animation effects to input fields
    const inputs = document.querySelectorAll('input[type="text"], select');
    
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentNode.style.transform = 'translateY(-2px)';
            input.parentNode.style.transition = 'transform 0.3s ease';
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
    const formInputs = document.querySelectorAll('#studentForm input, #studentForm select');
    
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
    const draftData = {
        name: document.getElementById('studentName').value,
        birthMonth: document.getElementById('birthMonth').value,
        birthDay: document.getElementById('birthDay').value,
        interests: [
            document.getElementById('interest1').value,
            document.getElementById('interest2').value,
            document.getElementById('interest3').value,
            document.getElementById('interest4').value,
            document.getElementById('interest5').value
        ],
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('studentFormDraft', JSON.stringify(draftData));
}

function loadDraft() {
    try {
        const draftData = localStorage.getItem('studentFormDraft');
        if (draftData) {
            const draft = JSON.parse(draftData);
            
            // Only load draft when form is empty
            const isEmpty = document.getElementById('studentName').value === '' &&
                          document.getElementById('birthMonth').value === '' &&
                          document.getElementById('birthDay').value === '' &&
                          document.getElementById('interest1').value === '';
            
            if (isEmpty) {
                document.getElementById('studentName').value = draft.name || '';
                if (draft.birthMonth && draft.birthDay) {
                    document.getElementById('birthMonth').value = draft.birthMonth;
                    document.getElementById('birthDay').value = draft.birthDay;
                    // Update date options
                    const studentSystem = window.studentFormSystem;
                    if (studentSystem && studentSystem.updateDayOptions) {
                        studentSystem.updateDayOptions();
                    }
                }
                draft.interests.forEach((interest, index) => {
                    const input = document.getElementById(`interest${index + 1}`);
                    if (input) {
                        input.value = interest || '';
                    }
                });
                
                if (draft.name || draft.birthMonth || draft.birthDay || draft.interests.some(i => i)) {
                    console.log('Form draft loaded');
                }
            }
        }
    } catch (error) {
        console.error('Error loading draft:', error);
    }
}

// Try to load draft on page load
window.addEventListener('load', () => {
    setTimeout(loadDraft, 500); // Delayed loading to ensure other initialization is complete
});
