class TeacherManagementSystem {
    constructor() {
        console.log('TeacherManagementSystem constructor called');
        this.students = [];
        this.allStudents = []; // 添加缺失的初始化
        this.groups = [];
        this.filteredStudents = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.firebaseListenerId = null;
        console.log('Initializing event listeners...');
        this.initializeEventListeners();
        console.log('Initializing Firebase...');
        this.initializeFirebase();
        console.log('TeacherManagementSystem constructor completed');
    }

    initializeEventListeners() {
        console.log('Setting up event listeners...');
        
        // Navigation controls - check if elements exist before adding listeners
        const refreshBtn = document.getElementById('refreshData');
        const exportDataBtn = document.getElementById('exportData');
        const exportGroupsBtn = document.getElementById('exportGroups');
        const exportBirthdaysBtn = document.getElementById('exportBirthdays');
        const clearAllBtn = document.getElementById('clearAllData');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshData());
        } else {
            console.warn('refreshData button not found');
        }
        
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportData());
        } else {
            console.log('exportData button not found (this is expected for interests page)');
        }
        
        if (exportGroupsBtn) {
            exportGroupsBtn.addEventListener('click', () => this.exportGroupsToExcel());
        } else {
            console.warn('exportGroups button not found');
        }
        
        if (exportBirthdaysBtn) {
            exportBirthdaysBtn.addEventListener('click', () => this.exportBirthdaysToExcel());
        } else {
            console.warn('exportBirthdays button not found');
        }
        
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.confirmClearAllData());
        } else {
            console.warn('clearAllData button not found');
        }
        
        const manageDuplicatesBtn = document.getElementById('manageDuplicates');
        if (manageDuplicatesBtn) {
            manageDuplicatesBtn.addEventListener('click', () => this.showDuplicateManagement());
        } else {
            console.warn('manageDuplicates button not found');
        }



        // Student list controls
        const sortBySelect = document.getElementById('sortBy');
        const searchInput = document.getElementById('searchInput');
        
        if (sortBySelect) {
            sortBySelect.addEventListener('change', () => this.sortAndDisplayStudents());
        } else {
            console.warn('sortBy select not found');
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', () => this.searchStudents());
        } else {
            console.warn('searchInput not found');
        }
        
        // Pagination controls
        const prevPageBtn = document.getElementById('prevPage');
        const nextPageBtn = document.getElementById('nextPage');
        const pageSizeSelect = document.getElementById('pageSize');
        
        if (prevPageBtn) {
            prevPageBtn.addEventListener('click', () => this.prevPage());
        } else {
            console.warn('prevPage button not found');
        }
        
        if (nextPageBtn) {
            nextPageBtn.addEventListener('click', () => this.nextPage());
        } else {
            console.warn('nextPage button not found');
        }
        
        if (pageSizeSelect) {
            pageSizeSelect.addEventListener('change', () => this.changePageSize());
        } else {
            console.warn('pageSize select not found');
        }

        // Grouping controls
        const generateGroupsBtn = document.getElementById('generateGroups');
        const regenerateGroupsBtn = document.getElementById('regenerateGroups');
        
        if (generateGroupsBtn) {
            generateGroupsBtn.addEventListener('click', () => {
                console.log('Generate Groups button clicked');
                this.generateGroups();
            });
        } else {
            console.error('Cannot find generateGroups button');
        }
        
        if (regenerateGroupsBtn) {
            regenerateGroupsBtn.addEventListener('click', () => {
                console.log('Regenerate Groups button clicked');
                this.generateGroups();
            });
        }

        // Modal controls
        const confirmYesBtn = document.getElementById('confirmYes');
        const confirmNoBtn = document.getElementById('confirmNo');
        
        if (confirmYesBtn) {
            confirmYesBtn.addEventListener('click', () => this.executeConfirmedAction());
        } else {
            console.warn('confirmYes button not found');
        }
        
        if (confirmNoBtn) {
            confirmNoBtn.addEventListener('click', () => this.hideConfirmModal());
        } else {
            console.warn('confirmNo button not found');
        }

        // Periodically refresh data
        setInterval(() => this.refreshData(), 30000); // Refresh every 30 seconds
    }

    async initializeFirebase() {
        try {
            // Load local data first
            this.loadLocalStudentData();
            
            // Try to initialize Firebase
            const firebaseReady = await window.firebaseService.initialize();
            
            if (firebaseReady) {
                console.log('Firebase connected, starting real-time sync');
                this.setupFirebaseListener();
                this.showNotification('🔥 Firebase connected, real-time sync enabled', 'success');
            } else {
                console.log('Firebase not configured, using local data');
                this.showNotification('📱 Using local data mode', 'info');
            }
            
        } catch (error) {
            console.error('Firebase initialization failed:', error);
            this.showNotification('⚠️ Cloud sync unavailable, using local data', 'warning');
        }
    }

    setupFirebaseListener() {
        if (this.firebaseListenerId) {
            window.firebaseService.removeListener(this.firebaseListenerId);
        }
        
        this.firebaseListenerId = window.firebaseService.onStudentsChange((firebaseStudents) => {
            console.log('Received Firebase data update:', firebaseStudents.length, 'records');
            
            // Merge Firebase data and local data
            this.mergeStudentData(firebaseStudents);
            
            // Update display
            this.updateDisplay();
            
            // Show update notification
            this.showNotification(`📊 Data updated - ${this.students.length} students currently`, 'info', 3000);
        });
    }

    mergeStudentData(firebaseStudents) {
        // Get local data
        const localStudents = JSON.parse(localStorage.getItem('studentsData') || '[]');
        
        // Create a Map to merge data, prioritizing Firebase data
        const studentMap = new Map();
        
        // Add local data first
        localStudents.forEach(student => {
            studentMap.set(student.id, student);
        });
        
        // Then add Firebase data (will override local duplicate data)
        firebaseStudents.forEach(student => {
            studentMap.set(student.id, student);
        });
        
        // Convert back to array
        this.students = Array.from(studentMap.values());
        this.allStudents = [...this.students]; // 同步更新 allStudents
        this.filteredStudents = [...this.students];
        
        // Update local storage
        localStorage.setItem('studentsData', JSON.stringify(this.students));
    }

    loadLocalStudentData() {
        try {
            const studentsData = localStorage.getItem('studentsData');
            this.students = studentsData ? JSON.parse(studentsData) : [];
            this.allStudents = [...this.students]; // 同步更新 allStudents
            this.filteredStudents = [...this.students];
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading student data:', error);
            this.students = [];
            this.allStudents = [];
            this.filteredStudents = [];
            this.updateDisplay();
        }
    }

    loadStudentData() {
        // Maintain backward compatibility
        this.loadLocalStudentData();
    }

    refreshData() {
        this.loadStudentData();
        this.showNotification('Data refreshed', 'success');
    }

    updateDisplay() {
        this.updateOverviewCards();
        this.sortAndDisplayStudents();
        this.updateGroupingSection();
        this.updateInterestAnalysis();
        this.updateBirthdayAnalysis();
        this.updateRelationshipGraph();
    }

    updateOverviewCards() {
        const totalStudents = this.students.length;
        const uniqueInterests = this.getUniqueInterests().length;
        const uniqueBirthdays = this.getUniqueBirthdays();
        const lastUpdate = totalStudents > 0 ? 
            this.formatDateTime(Math.max(...this.students.map(s => new Date(s.submitTime).getTime()))) : '-';

        document.getElementById('totalStudents').textContent = totalStudents;
        document.getElementById('uniqueInterests').textContent = uniqueInterests;
        document.getElementById('uniqueBirthdays').textContent = uniqueBirthdays;
        document.getElementById('lastUpdate').textContent = lastUpdate;
    }

    getUniqueInterests() {
        const allInterests = this.students.flatMap(student => student.interests || []);
        return [...new Set(allInterests.filter(interest => interest.trim() !== ''))];
    }

    getUniqueBirthdays() {
        const birthdaySet = new Set();
        this.students.forEach(student => {
            if (student.birthDate && student.birthDate.formatted) {
                birthdaySet.add(student.birthDate.formatted);
            }
        });
        return birthdaySet.size;
    }

    formatBirthDate(birthDate) {
        if (!birthDate || !birthDate.formatted) {
            return 'Not specified';
        }
        
        const monthNames = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const [month, day] = birthDate.formatted.split('-');
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        
        return `${monthNames[monthNum]} ${dayNum}`;
    }

    formatBirthDateKey(birthDate) {
        if (!birthDate || !birthDate.formatted) {
            return '00-00';
        }
        return birthDate.formatted;
    }

    formatBirthDateFromKey(dateKey) {
        if (!dateKey || dateKey === 'Unknown') {
            return 'Unknown';
        }
        
        const [month, day] = dateKey.split('-');
        const monthNames = [
            '', 'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const monthNum = parseInt(month);
        const dayNum = parseInt(day);
        
        if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
            return `${monthNames[monthNum]} ${dayNum}`;
        }
        
        return dateKey;
    }

    formatDateTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    sortAndDisplayStudents() {
        const sortBy = document.getElementById('sortBy').value;
        
        this.filteredStudents.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name, 'zh-CN');
                case 'birthDate':
                    return this.formatBirthDateKey(a.birthDate).localeCompare(this.formatBirthDateKey(b.birthDate));
                case 'submitTime':
                    return new Date(b.submitTime) - new Date(a.submitTime);
                default:
                    return 0;
            }
        });

        this.displayStudents();
    }

    searchStudents() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        
        if (searchTerm === '') {
            this.filteredStudents = [...this.students];
        } else {
            this.filteredStudents = this.students.filter(student => {
                const nameMatch = student.name.toLowerCase().includes(searchTerm);
                const interestMatch = student.interests?.some(interest => 
                    interest.toLowerCase().includes(searchTerm)
                );
                return nameMatch || interestMatch;
            });
        }
        
        this.currentPage = 1; // Reset to first page
        this.sortAndDisplayStudents();
    }

    displayStudents() {
        const studentsList = document.getElementById('studentsList');
        const pagination = document.getElementById('pagination');
        
        if (this.filteredStudents.length === 0) {
            pagination.style.display = 'none';
            if (this.students.length === 0) {
                // No student data available
                studentsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📝</div>
                        <h3>No Student Data Available</h3>
                        <p>No students have submitted information yet. You can guide students to the form page or use the test data generator for quick testing.</p>
                        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                            <a href="interests-birthday-form.html" class="cta-btn">Go to Student Form Page</a>
                            <a href="test-data-lab.html" class="cta-btn" style="background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);">Generate Test Data</a>
                        </div>
                    </div>
                `;
            } else {
                // Search results are empty
                studentsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3>No Matching Students Found</h3>
                        <p>Please try different search keywords</p>
                    </div>
                `;
            }
            return;
        }

        // Calculate pagination
        const totalPages = Math.ceil(this.filteredStudents.length / this.pageSize);
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const currentPageStudents = this.filteredStudents.slice(startIndex, endIndex);

        // Display students for current page
        studentsList.innerHTML = currentPageStudents.map(student => {
            return `
                <div class="student-card" data-student-id="${student.id}">
                    <div class="student-header">
                        <div class="student-name">${student.name}</div>
                        <div class="student-submit-time">${this.formatDateTime(new Date(student.submitTime).getTime())}</div>
                    </div>
                    <div class="student-details">
                        <div class="student-birthdate">Birth Date: ${this.formatBirthDate(student.birthDate)}</div>
                    </div>
                    <div class="student-interests">
                        <span class="interests-label">Interests:</span>
                        <div class="interest-tags">
                            ${(student.interests || []).map(interest => 
                                `<span class="interest-tag">${interest}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Update pagination
        this.updatePagination(totalPages);
    }

    updatePagination(totalPages) {
        const pagination = document.getElementById('pagination');
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        const pageNumbers = document.getElementById('pageNumbers');
        const paginationInfo = document.getElementById('paginationInfo');

        if (totalPages <= 1) {
            pagination.style.display = 'none';
            return;
        }

        pagination.style.display = 'flex';

        // Update buttons
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;

        // Update page numbers
        pageNumbers.innerHTML = '';
        
        // Show page numbers (max 7 pages visible)
        let startPage = Math.max(1, this.currentPage - 3);
        let endPage = Math.min(totalPages, startPage + 6);
        
        if (endPage - startPage < 6) {
            startPage = Math.max(1, endPage - 6);
        }

        if (startPage > 1) {
            pageNumbers.appendChild(this.createPageButton(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pageNumbers.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.appendChild(this.createPageButton(i));
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.className = 'pagination-ellipsis';
                pageNumbers.appendChild(ellipsis);
            }
            pageNumbers.appendChild(this.createPageButton(totalPages));
        }

        // Update info
        const startIndex = (this.currentPage - 1) * this.pageSize + 1;
        const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredStudents.length);
        paginationInfo.textContent = `Showing ${startIndex}-${endIndex} of ${this.filteredStudents.length} students`;
    }

    createPageButton(pageNum) {
        const button = document.createElement('button');
        button.className = `pagination-btn ${pageNum === this.currentPage ? 'active' : ''}`;
        button.textContent = pageNum;
        button.addEventListener('click', () => this.goToPage(pageNum));
        return button;
    }

    goToPage(pageNum) {
        this.currentPage = pageNum;
        this.displayStudents();
    }

    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayStudents();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.filteredStudents.length / this.pageSize);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayStudents();
        }
    }

    changePageSize() {
        this.pageSize = parseInt(document.getElementById('pageSize').value);
        this.currentPage = 1;
        this.displayStudents();
    }



    updateGroupingSection() {
        const groupingSection = document.getElementById('groupingSection');
        const generateBtn = document.getElementById('generateGroups');
        
        if (this.students.length < 2) {
            generateBtn.disabled = true;
            generateBtn.textContent = `Need at least 2 students (Current: ${this.students.length})`;
        } else {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Groups';
        }
    }

    generateGroups() {
        console.log('Starting group generation...');
        console.log('Current students data:', this.students);
        
        const numGroupsInput = document.getElementById('groupCount');
        if (!numGroupsInput) {
            console.error('Cannot find groupCount input element');
            this.showNotification('Error: Cannot find group count input', 'error');
            return;
        }
        
        const numGroups = parseInt(numGroupsInput.value);
        console.log('Number of groups:', numGroups);
        console.log('Number of students:', this.students.length);
        
        if (!this.students || this.students.length === 0) {
            this.showNotification('No student data available. Please ensure students have submitted interest information.', 'error');
            return;
        }
        
        if (this.students.length < numGroups) {
            this.showNotification('Number of groups cannot exceed total number of students', 'error');
            return;
        }

        if (this.students.length < 2) {
            this.showNotification('At least 2 students are required for grouping', 'error');
            return;
        }

        // No longer need age information, proceed directly with grouping
        console.log('Creating balanced groups...');
        try {
            this.groups = this.createBalancedGroups(numGroups);
            console.log('Groups created:', this.groups);
            
            this.displayGroups();
            this.showGroupStatistics();
            this.saveGroupAssignments();
            this.showNotification('Groups generated successfully', 'success');
        } catch (error) {
            console.error('Error generating groups:', error);
            this.showNotification('Error generating groups: ' + error.message, 'error');
            return;
        }
        
        // Show regroup button
        document.getElementById('generateGroups').style.display = 'none';
        document.getElementById('regenerateGroups').style.display = 'inline-block';
        
        document.getElementById('groupsContainer').style.display = 'grid';
        document.getElementById('groupStats').style.display = 'block';
        document.getElementById('analysisSection').style.display = 'block';
        document.getElementById('graphSection').style.display = 'block';
        document.getElementById('birthdaySection').style.display = 'block';
    }

    createBalancedGroups(numGroups) {
        console.log('Creating balanced groups for', numGroups, 'groups');
        const students = [...this.students];
        console.log('Students data:', students);
        const groups = Array.from({ length: numGroups }, () => []);
        
        // Create similarity matrix
        console.log('Creating similarity matrix...');
        const similarityMatrix = this.createSimilarityMatrix(students);
        console.log('Similarity matrix created');
        
        // Find the most diverse seed students
        const seeds = this.findDiverseSeeds(students, similarityMatrix, numGroups);
        
        // Assign seeds to each group
        seeds.forEach((seedIndex, groupIndex) => {
            groups[groupIndex].push(students[seedIndex]);
            students[seedIndex] = null; // Mark as assigned
        });
        
        // Assign remaining students
        const remainingStudents = students.filter(student => student !== null);
        
        remainingStudents.forEach(student => {
            const bestGroupIndex = this.findBestGroup(student, groups);
            groups[bestGroupIndex].push(student);
        });
        
        // Balance group sizes
        this.balanceGroupSizes(groups);
        
        return groups;
    }

    createSimilarityMatrix(students) {
        const matrix = [];
        for (let i = 0; i < students.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < students.length; j++) {
                if (i === j) {
                    matrix[i][j] = 1;
                } else {
                    matrix[i][j] = this.calculateSimilarity(students[i], students[j]);
                }
            }
        }
        return matrix;
    }

    calculateSimilarity(student1, student2) {
        // Group based only on interest similarity
        const interestSimilarity = this.calculateInterestSimilarity(
            student1.interests || [], 
            student2.interests || []
        );
        
        return interestSimilarity;
    }

    calculateInterestSimilarity(interests1, interests2) {
        const set1 = new Set(interests1.map(i => i.toLowerCase()));
        const set2 = new Set(interests2.map(i => i.toLowerCase()));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return union.size > 0 ? intersection.size / union.size : 0;
    }



    findDiverseSeeds(students, similarityMatrix, numGroups) {
        const seeds = [];
        
        // For similarity-based grouping, we still want some diversity in seeds to create distinct groups
        // Find student with moderate average similarity as first seed
        let firstSeed = 0;
        let bestAvgSimilarity = -1;
        
        for (let i = 0; i < students.length; i++) {
            const avgSimilarity = similarityMatrix[i].reduce((sum, sim) => sum + sim, 0) / students.length;
            // Look for students with moderate similarity (not too high, not too low)
            const targetSimilarity = 0.3; // Target moderate similarity
            const score = 1 - Math.abs(avgSimilarity - targetSimilarity);
            
            if (score > bestAvgSimilarity) {
                bestAvgSimilarity = score;
                firstSeed = i;
            }
        }
        
        seeds.push(firstSeed);
        
        // Find other seeds that provide good group starting points
        for (let seedCount = 1; seedCount < numGroups; seedCount++) {
            let nextSeed = 0;
            let bestScore = -1;
            
            for (let i = 0; i < students.length; i++) {
                if (seeds.includes(i)) continue;
                
                // Find students that are reasonably different from existing seeds
                // but not completely dissimilar (to allow for similarity-based grouping)
                const avgDistanceFromSeeds = seeds.reduce((sum, seedIndex) => {
                    return sum + (1 - similarityMatrix[i][seedIndex]);
                }, 0) / seeds.length;
                
                // Prefer moderate distance (0.4-0.7 range)
                const targetDistance = 0.55;
                const score = 1 - Math.abs(avgDistanceFromSeeds - targetDistance);
                
                if (score > bestScore) {
                    bestScore = score;
                    nextSeed = i;
                }
            }
            
            seeds.push(nextSeed);
        }
        
        return seeds;
    }

    findBestGroup(student, groups) {
        let bestGroupIndex = 0;
        let highestScore = -Infinity;
        
        groups.forEach((group, groupIndex) => {
            if (group.length === 0) return;
            
            const avgSimilarity = group.reduce((sum, groupMember) => {
                return sum + this.calculateSimilarity(student, groupMember);
            }, 0) / group.length;
            
            // Consider group size balance, slightly favor smaller groups but prioritize similarity
            const sizePenalty = group.length * 0.05; // Reduced penalty for size
            const score = avgSimilarity - sizePenalty; // Higher similarity = higher score
            
            if (score > highestScore) {
                highestScore = score;
                bestGroupIndex = groupIndex;
            }
        });
        
        return bestGroupIndex;
    }

    balanceGroupSizes(groups) {
        const totalStudents = groups.reduce((sum, group) => sum + group.length, 0);
        const idealGroupSize = Math.floor(totalStudents / groups.length);
        const remainder = totalStudents % groups.length;
        
        // Move students to balance group sizes
        for (let i = 0; i < groups.length; i++) {
            const targetSize = idealGroupSize + (i < remainder ? 1 : 0);
            
            while (groups[i].length > targetSize + 1) {
                // Find the smallest group
                const smallestGroupIndex = groups.findIndex((group, index) => 
                    index !== i && group.length < idealGroupSize
                );
                
                if (smallestGroupIndex === -1) break;
                
                const studentToMove = groups[i].pop();
                groups[smallestGroupIndex].push(studentToMove);
            }
        }
    }

    displayGroups() {
        const groupsContainer = document.getElementById('groupsContainer');
        
        groupsContainer.innerHTML = this.groups.map((group, index) => {
            // Sort group members by birth date
            const sortedGroup = [...group].sort((a, b) => {
                return this.formatBirthDateKey(a.birthDate).localeCompare(this.formatBirthDateKey(b.birthDate));
            });
            
            return `
                <div class="group-card">
                    <div class="group-header">Group ${index + 1} (${sortedGroup.length} members)</div>
                    <ul class="group-members">
                        ${sortedGroup.map(student => `
                            <li class="group-member">
                                <div class="member-name">${student.name}</div>
                                <div class="member-details">
                                    Birth Date: ${this.formatBirthDate(student.birthDate)}
                                </div>
                                <div class="member-interests">
                                    Interests: ${(student.interests || []).join(', ')}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }

    async saveGroupAssignments() {
        try {
            // Save group assignments to localStorage for students to access
            localStorage.setItem('groupAssignments', JSON.stringify(this.groups));
            
            // Also save to Firebase if available
            if (window.firebaseService && window.firebaseService.initialized) {
                await window.firebaseService.submitGroupAssignments(this.groups);
                console.log('Group assignments saved to Firebase successfully');
            }
        } catch (error) {
            console.error('Error saving group assignments:', error);
        }
    }

    showGroupStatistics() {
        const statsContent = document.getElementById('statsContent');
        
        // Calculate statistics
        const totalStudents = this.students.length;
        const numGroups = this.groups.length;
        const avgGroupSize = (totalStudents / numGroups).toFixed(1);
        const groupSizes = this.groups.map(group => group.length);
        const minGroupSize = Math.min(...groupSizes);
        const maxGroupSize = Math.max(...groupSizes);
        
        // Calculate average similarity within groups
        const avgIntraGroupSimilarity = this.groups.reduce((sum, group) => {
            if (group.length < 2) return sum;
            
            let groupSimilaritySum = 0;
            let pairCount = 0;
            
            for (let i = 0; i < group.length; i++) {
                for (let j = i + 1; j < group.length; j++) {
                    groupSimilaritySum += this.calculateSimilarity(group[i], group[j]);
                    pairCount++;
                }
            }
            
            return sum + (pairCount > 0 ? groupSimilaritySum / pairCount : 0);
        }, 0) / numGroups;
        
        statsContent.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total Students:</span>
                <span class="stat-value">${totalStudents}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Number of Groups:</span>
                <span class="stat-value">${numGroups}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Group Size:</span>
                <span class="stat-value">${avgGroupSize}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Group Size Range:</span>
                <span class="stat-value">${minGroupSize} - ${maxGroupSize}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Average Interest Similarity:</span>
                <span class="stat-value">${(avgIntraGroupSimilarity * 100).toFixed(1)}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Group Balance Score:</span>
                <span class="stat-value">${this.calculateBalanceScore()}%</span>
            </div>
        `;
    }

    calculateBalanceScore() {
        if (this.groups.length === 0) return 100;
        
        const groupSizes = this.groups.map(group => group.length);
        const avgSize = groupSizes.reduce((sum, size) => sum + size, 0) / groupSizes.length;
        const variance = groupSizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / groupSizes.length;
        const balance = Math.max(0, 100 - (variance * 20)); // Convert to percentage
        
        return balance.toFixed(1);
    }

    updateInterestAnalysis() {
        const analysisSection = document.getElementById('analysisSection');
        const interestAnalysis = document.getElementById('interestAnalysis');
        
        if (this.students.length === 0) {
            analysisSection.style.display = 'none';
            return;
        }

        // Count interest distribution
        const interestCounts = {};
        this.students.forEach(student => {
            (student.interests || []).forEach(interest => {
                const normalizedInterest = interest.trim();
                if (normalizedInterest) {
                    interestCounts[normalizedInterest] = (interestCounts[normalizedInterest] || 0) + 1;
                }
            });
        });

        // Sort by count
        const sortedInterests = Object.entries(interestCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15); // Show only top 15

        interestAnalysis.innerHTML = sortedInterests.map(([interest, count]) => `
            <div class="interest-item">
                <span class="interest-name">${interest}</span>
                <span class="interest-count">${count}</span>
            </div>
        `).join('');

        analysisSection.style.display = this.students.length > 0 ? 'block' : 'none';
    }

    updateBirthdayAnalysis() {
        const birthdaySection = document.getElementById('birthdaySection');
        const birthdayAnalysis = document.getElementById('birthdayAnalysis');
        
        if (this.students.length === 0) {
            birthdaySection.style.display = 'none';
            return;
        }

        // Group by birthday
        const birthdayGroups = {};
        this.students.forEach(student => {
            const birthDate = student.birthDate && student.birthDate.formatted ? student.birthDate.formatted : 'Unknown';
            if (!birthdayGroups[birthDate]) {
                birthdayGroups[birthDate] = [];
            }
            birthdayGroups[birthDate].push(student);
        });

        // Only show birthdays with multiple students
        const sameBirthdayGroups = Object.entries(birthdayGroups)
            .filter(([date, students]) => students.length > 1)
            .sort(([dateA], [dateB]) => this.formatBirthDateKey({formatted: dateA}).localeCompare(this.formatBirthDateKey({formatted: dateB})));

        if (sameBirthdayGroups.length === 0) {
            birthdayAnalysis.innerHTML = `
                <div class="birthday-group">
                    <div class="birthday-date">No Students Share the Same Birthday</div>
                    <p style="color: #4a5568; font-style: italic;">All students have unique birth dates.</p>
                </div>
            `;
        } else {
            birthdayAnalysis.innerHTML = sameBirthdayGroups.map(([date, students]) => `
                <div class="birthday-group">
                    <div class="birthday-date">${this.formatBirthDateFromKey(date)} (${students.length} students)</div>
                    <ul class="birthday-students">
                        ${students.map(student => `
                            <li class="birthday-student">
                                <div class="birthday-student-name">${student.name}</div>
                                <div class="birthday-student-interests">
                                    Interests: ${(student.interests || []).join(', ')}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `).join('');
        }

        birthdaySection.style.display = this.students.length > 0 ? 'block' : 'none';
    }

    updateRelationshipGraph() {
        const graphSection = document.getElementById('graphSection');
        
        if (this.students.length === 0) {
            graphSection.style.display = 'none';
            return;
        }

        this.drawRelationshipGraph();
        graphSection.style.display = this.students.length > 0 ? 'block' : 'none';
    }

    drawRelationshipGraph() {
        const canvas = document.getElementById('graphCanvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.students.length === 0) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.35;
        
        // Calculate student positions (circular arrangement)
        const studentPositions = this.students.map((student, index) => {
            const angle = (2 * Math.PI * index) / this.students.length;
            return {
                student: student,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });

        // Draw connection lines (based on interest similarity)
        ctx.strokeStyle = '#cbd5e0';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < studentPositions.length; i++) {
            for (let j = i + 1; j < studentPositions.length; j++) {
                const pos1 = studentPositions[i];
                const pos2 = studentPositions[j];
                const similarity = this.calculateSimilarity(pos1.student, pos2.student);
                
                // Only show connections with similarity > 0
                if (similarity > 0) {
                    const alpha = similarity * 0.8 + 0.2; // Transparency based on similarity
                    const lineWidth = similarity * 3 + 1; // Line width based on similarity
                    
                    ctx.globalAlpha = alpha;
                    ctx.lineWidth = lineWidth;
                    ctx.strokeStyle = similarity > 0.5 ? '#48bb78' : '#667eea';
                    
                    ctx.beginPath();
                    ctx.moveTo(pos1.x, pos1.y);
                    ctx.lineTo(pos2.x, pos2.y);
                    ctx.stroke();
                }
            }
        }

        // Reset transparency
        ctx.globalAlpha = 1;

        // Draw student nodes
        studentPositions.forEach((pos, index) => {
            // Draw circle
            ctx.fillStyle = '#667eea';
            ctx.strokeStyle = '#4c51bf';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            // Draw student name
            ctx.fillStyle = '#2d3748';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            
            const nameWidth = ctx.measureText(pos.student.name).width;
            const textX = pos.x;
            const textY = pos.y > centerY ? pos.y + 30 : pos.y - 20;
            
            // Draw text background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(textX - nameWidth/2 - 3, textY - 12, nameWidth + 6, 16);
            
            // Draw text
            ctx.fillStyle = '#2d3748';
            ctx.fillText(pos.student.name, textX, textY);
        });
    }

    exportData() {
        try {
            const exportData = {
                students: this.students,
                groups: this.groups,
                exportTime: new Date().toISOString(),
                totalStudents: this.students.length,
                groupCount: this.groups.length
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `student_grouping_data_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('Data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting data:', error);
            this.showNotification('Data export failed', 'error');
        }
    }

    exportGroupsToExcel() {
        if (this.groups.length === 0) {
            this.showNotification('No groups available to export. Please generate groups first.', 'error');
            return;
        }

        try {
            // Create CSV content for groups
            let csvContent = 'Group Number,Student Name,Birth Date,Interests\n';
            
            this.groups.forEach((group, groupIndex) => {
                // Sort group members by birth date
                const sortedGroup = [...group].sort((a, b) => {
                    return this.formatBirthDateKey(a.birthDate).localeCompare(this.formatBirthDateKey(b.birthDate));
                });
                
                sortedGroup.forEach(student => {
                    const birthDate = this.formatBirthDate(student.birthDate);
                    const interests = (student.interests || []).join('; ');
                    
                    csvContent += `Group ${groupIndex + 1},"${student.name}","${birthDate}","${interests}"\n`;
                });
                
                // Add empty row between groups
                if (groupIndex < this.groups.length - 1) {
                    csvContent += '\n';
                }
            });

            // Add statistics at the end
            csvContent += '\n\nGroup Statistics\n';
            csvContent += 'Metric,Value\n';
            csvContent += `Total Students,${this.students.length}\n`;
            csvContent += `Number of Groups,${this.groups.length}\n`;
            csvContent += `Average Group Size,${(this.students.length / this.groups.length).toFixed(1)}\n`;
            
            const groupSizes = this.groups.map(group => group.length);
            csvContent += `Group Size Range,"${Math.min(...groupSizes)} - ${Math.max(...groupSizes)}"\n`;
            csvContent += `Group Balance Score,${this.calculateBalanceScore()}%\n`;

            this.downloadCSV(csvContent, `group_results_${new Date().toISOString().split('T')[0]}.csv`);
            this.showNotification('Group results exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting groups:', error);
            this.showNotification('Failed to export group results', 'error');
        }
    }

    exportBirthdaysToExcel() {
        if (this.students.length === 0) {
            this.showNotification('No student data available to export.', 'error');
            return;
        }

        try {
            // Group students by birthday
            const birthdayGroups = {};
            this.students.forEach(student => {
                const birthDate = student.birthDate && student.birthDate.formatted ? student.birthDate.formatted : 'Unknown';
                if (!birthdayGroups[birthDate]) {
                    birthdayGroups[birthDate] = [];
                }
                birthdayGroups[birthDate].push(student);
            });

            // Create CSV content for birthdays - each student on separate row
            let csvContent = 'Birth Date,Same Birthday Group Size,Student Name,Birth Date,Interests\n';
            
            // Sort by date
            const sortedBirthdays = Object.entries(birthdayGroups)
                .sort(([dateA], [dateB]) => this.formatBirthDateKey({formatted: dateA}).localeCompare(this.formatBirthDateKey({formatted: dateB})));

            sortedBirthdays.forEach(([date, students]) => {
                const formattedDate = this.formatBirthDateFromKey(date);
                const groupSize = students.length;
                
                // Sort students by name within each birthday group
                const sortedStudents = students.sort((a, b) => a.name.localeCompare(b.name));
                
                sortedStudents.forEach(student => {
                    const birthDate = this.formatBirthDate(student.birthDate);
                    const interests = (student.interests || []).join('; ');
                    
                    csvContent += `"${formattedDate}",${groupSize},"${student.name}","${birthDate}","${interests}"\n`;
                });
            });

            // Add statistics
            csvContent += '\n\nBirthday Statistics\n';
            csvContent += 'Metric,Value\n';
            csvContent += `Total Students,${this.students.length}\n`;
            csvContent += `Unique Birth Dates,${Object.keys(birthdayGroups).length}\n`;
            
            const sameBirthdayGroups = Object.values(birthdayGroups).filter(group => group.length > 1);
            csvContent += `Students with Same Birthday,${sameBirthdayGroups.length > 0 ? 'Yes' : 'No'}\n`;
            csvContent += `Same Birthday Groups,${sameBirthdayGroups.length}\n`;

            if (sameBirthdayGroups.length > 0) {
                const totalSameBirthday = sameBirthdayGroups.reduce((sum, group) => sum + group.length, 0);
                csvContent += `Students in Same Birthday Groups,${totalSameBirthday}\n`;
            }

            this.downloadCSV(csvContent, `birthday_analysis_${new Date().toISOString().split('T')[0]}.csv`);
            this.showNotification('Birthday analysis exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting birthdays:', error);
            this.showNotification('Failed to export birthday analysis', 'error');
        }
    }

    downloadCSV(csvContent, filename) {
        // Add BOM for proper UTF-8 encoding in Excel
        const BOM = '\uFEFF';
        const csvBlob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(csvBlob);
        link.download = filename;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(link.href);
    }

    confirmClearAllData() {
        this.pendingAction = 'clearAll';
        this.showConfirmModal('Are you sure you want to clear all student data?', 'This operation will permanently delete all student information and group results from Firebase, and cannot be undone.');
    }



    async executeConfirmedAction() {
        if (this.pendingAction === 'clearAll') {
            await this.clearAllDataFromFirebase();
        }
        this.hideConfirmModal();
    }

    async clearAllDataFromFirebase() {
        try {
            // 检查Firebase服务是否可用
            if (!window.firebaseService || !window.firebaseService.initialized) {
                this.showNotification('Firebase service not available. Please check your connection.', 'error');
                return;
            }

            // 删除Firebase中的数据
            await window.firebaseService.clearAllInterestsData();
            
            // 清理本地存储
            localStorage.removeItem('studentsData');
            localStorage.removeItem('currentStudentId');
            localStorage.removeItem('studentFormDraft');
            localStorage.removeItem('groupAssignments');
            
            // 清理内存中的数据
            this.students = [];
            this.allStudents = [];
            this.groups = [];
            this.filteredStudents = [];
            
            this.updateDisplay();
            
            // Hide grouping related content
            document.getElementById('groupsContainer').style.display = 'none';
            document.getElementById('groupStats').style.display = 'none';
            document.getElementById('analysisSection').style.display = 'none';
            document.getElementById('graphSection').style.display = 'none';
            document.getElementById('birthdaySection').style.display = 'none';
            document.getElementById('generateGroups').style.display = 'inline-block';
            document.getElementById('regenerateGroups').style.display = 'none';
            
            this.showNotification('All data cleared from Firebase successfully', 'success');
        } catch (error) {
            console.error('Error clearing data from Firebase:', error);
            this.showNotification('Failed to clear data from Firebase', 'error');
        }
    }

    clearAllData() {
        try {
            localStorage.removeItem('studentsData');
            localStorage.removeItem('currentStudentId');
            localStorage.removeItem('studentFormDraft');
            localStorage.removeItem('groupAssignments');
            
            this.students = [];
            this.allStudents = [];
            this.groups = [];
            this.filteredStudents = [];
            
            this.updateDisplay();
            
            // Hide grouping related content
            document.getElementById('groupsContainer').style.display = 'none';
            document.getElementById('groupStats').style.display = 'none';
            document.getElementById('analysisSection').style.display = 'none';
            document.getElementById('graphSection').style.display = 'none';
            document.getElementById('birthdaySection').style.display = 'none';
            document.getElementById('generateGroups').style.display = 'inline-block';
            document.getElementById('regenerateGroups').style.display = 'none';
            
            this.showNotification('All data cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing data:', error);
            this.showNotification('Failed to clear data', 'error');
        }
    }

    showConfirmModal(title, message) {
        document.getElementById('confirmModal').querySelector('h3').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').style.display = 'flex';
    }

    hideConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.pendingAction = null;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#4299e1'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 1001;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Animate display
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Auto hide
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 重复数据管理功能
    showDuplicateManagement() {
        const duplicates = this.findDuplicateStudents();
        
        if (duplicates.length === 0) {
            alert('🎉 未发现重复数据！\n所有学生记录都是唯一的。');
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'duplicate-management-modal';
        modal.innerHTML = `
            <div class="duplicate-management-content">
                <div class="duplicate-management-header">
                    <h3>🔍 重复数据管理</h3>
                    <p>发现 ${duplicates.length} 组重复数据，请选择保留哪条记录：</p>
                    <button class="close-btn" onclick="this.closest('.duplicate-management-modal').remove()">×</button>
                </div>
                
                <div class="duplicate-groups">
                    ${duplicates.map((group, index) => this.renderDuplicateGroup(group, index)).join('')}
                </div>
                
                <div class="duplicate-management-actions">
                    <button class="btn-auto-resolve" onclick="teacherManagementSystem.autoResolveDuplicates()">
                        🤖 自动处理（保留最新记录）
                    </button>
                    <button class="btn-cancel" onclick="this.closest('.duplicate-management-modal').remove()">
                        ❌ 取消
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    findDuplicateStudents() {
        const duplicateGroups = [];
        const seen = new Map();
        
        // 确保 allStudents 存在且是数组
        if (!this.allStudents || !Array.isArray(this.allStudents)) {
            console.warn('allStudents is not properly initialized');
            this.allStudents = [];
            return duplicateGroups;
        }
        
        this.allStudents.forEach(student => {
            const key = `${student.name}_${student.birthDate?.month}_${student.birthDate?.day}`;
            
            if (seen.has(key)) {
                const existingGroup = seen.get(key);
                existingGroup.push(student);
            } else {
                seen.set(key, [student]);
            }
        });
        
        // 只返回有多个记录的组
        seen.forEach(group => {
            if (group.length > 1) {
                duplicateGroups.push(group);
            }
        });
        
        return duplicateGroups;
    }

    renderDuplicateGroup(group, groupIndex) {
        return `
            <div class="duplicate-group" data-group="${groupIndex}">
                <h4>👥 重复组 ${groupIndex + 1}: ${group[0].name}</h4>
                <div class="duplicate-records">
                    ${group.map((student, recordIndex) => `
                        <div class="duplicate-record">
                            <div class="record-header">
                                <input type="radio" name="keep_group_${groupIndex}" value="${recordIndex}" 
                                       id="keep_${groupIndex}_${recordIndex}" ${recordIndex === 0 ? 'checked' : ''}>
                                <label for="keep_${groupIndex}_${recordIndex}">
                                    <strong>记录 ${recordIndex + 1}</strong>
                                    ${recordIndex === 0 ? '<span class="recommended">推荐</span>' : ''}
                                </label>
                            </div>
                            <div class="record-details">
                                <p><strong>姓名:</strong> ${student.name}</p>
                                <p><strong>生日:</strong> ${student.birthDate?.month}月${student.birthDate?.day}日</p>
                                <p><strong>兴趣:</strong> ${student.interests ? student.interests.join(', ') : '无'}</p>
                                <p><strong>提交时间:</strong> ${new Date(student.submitTime || student.timestamp).toLocaleString()}</p>
                                <p><strong>修改次数:</strong> ${student.updateCount || 0}</p>
                                ${student.firebaseId ? `<p><strong>Firebase ID:</strong> ${student.firebaseId}</p>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="group-actions">
                    <button class="btn-resolve-group" onclick="teacherManagementSystem.resolveGroup(${groupIndex})">
                        ✅ 处理此组
                    </button>
                </div>
            </div>
        `;
    }

    async resolveGroup(groupIndex) {
        const duplicates = this.findDuplicateStudents();
        const group = duplicates[groupIndex];
        
        const selectedRadio = document.querySelector(`input[name="keep_group_${groupIndex}"]:checked`);
        if (!selectedRadio) {
            alert('请选择要保留的记录');
            return;
        }
        
        const keepIndex = parseInt(selectedRadio.value);
        const keepRecord = group[keepIndex];
        const removeRecords = group.filter((_, index) => index !== keepIndex);
        
        try {
            // 从Firebase删除不需要的记录
            if (window.firebaseService && window.firebaseService.initialized) {
                for (const record of removeRecords) {
                    if (record.firebaseId) {
                        await window.firebaseService.database.ref(`students/${record.firebaseId}`).remove();
                    }
                }
            }
            
            // 从本地数据中移除重复记录
            this.allStudents = this.allStudents.filter(student => {
                return !removeRecords.some(remove => 
                    remove.name === student.name && 
                    remove.birthDate?.month === student.birthDate?.month && 
                    remove.birthDate?.day === student.birthDate?.day &&
                    remove.submitTime === student.submitTime
                );
            });
            
            // 更新显示
            this.displayStudents();
            this.updateOverviewCards();
            
            // 移除已处理的组
            const groupElement = document.querySelector(`[data-group="${groupIndex}"]`);
            if (groupElement) {
                groupElement.remove();
            }
            
            // 检查是否还有其他重复组
            const remainingGroups = document.querySelectorAll('.duplicate-group');
            if (remainingGroups.length === 0) {
                document.querySelector('.duplicate-management-modal').remove();
                alert('✅ 重复数据处理完成！');
            }
            
        } catch (error) {
            console.error('处理重复数据失败:', error);
            alert('处理失败，请重试');
        }
    }

    async autoResolveDuplicates() {
        const duplicates = this.findDuplicateStudents();
        
        if (!confirm(`确定要自动处理所有 ${duplicates.length} 组重复数据吗？\n系统将保留每组中最新的记录。`)) {
            return;
        }
        
        try {
            for (const group of duplicates) {
                // 按提交时间排序，保留最新的
                group.sort((a, b) => {
                    const timeA = new Date(a.submitTime || a.timestamp).getTime();
                    const timeB = new Date(b.submitTime || b.timestamp).getTime();
                    return timeB - timeA; // 降序，最新的在前
                });
                
                const keepRecord = group[0];
                const removeRecords = group.slice(1);
                
                // 从Firebase删除旧记录
                if (window.firebaseService && window.firebaseService.initialized) {
                    for (const record of removeRecords) {
                        if (record.firebaseId) {
                            await window.firebaseService.database.ref(`students/${record.firebaseId}`).remove();
                        }
                    }
                }
                
                // 从本地数据中移除重复记录
                this.allStudents = this.allStudents.filter(student => {
                    return !removeRecords.some(remove => 
                        remove.name === student.name && 
                        remove.birthDate?.month === student.birthDate?.month && 
                        remove.birthDate?.day === student.birthDate?.day &&
                        remove.submitTime === student.submitTime
                    );
                });
            }
            
            // 更新显示
            this.displayStudents();
            this.updateOverviewCards();
            
            // 关闭对话框
            document.querySelector('.duplicate-management-modal').remove();
            
            alert(`✅ 自动处理完成！\n清理了 ${duplicates.reduce((sum, group) => sum + group.length - 1, 0)} 条重复记录。`);
            
        } catch (error) {
            console.error('自动处理重复数据失败:', error);
            alert('自动处理失败，请手动处理或重试');
        }
    }




}

// Initialize system after page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing TeacherManagementSystem...');
    try {
        window.teacherManagementSystem = new TeacherManagementSystem();
        console.log('TeacherManagementSystem initialized successfully');
        console.log('Global instance available as:', window.teacherManagementSystem);
    } catch (error) {
        console.error('Error initializing TeacherManagementSystem:', error);
    }
});
