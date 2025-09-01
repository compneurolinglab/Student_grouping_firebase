class TeacherMBTIManagementSystem {
    constructor() {
        console.log('TeacherMBTIManagementSystem constructor called');
        this.students = [];
        this.groups = [];
        this.filteredStudents = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.firebaseListenerId = null;
        this.mbtiTypes = [
            'INTJ', 'INTP', 'ENTJ', 'ENTP', // Analysts (NT)
            'INFJ', 'INFP', 'ENFJ', 'ENFP', // Diplomats (NF)
            'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', // Sentinels (SJ)
            'ISTP', 'ISFP', 'ESTP', 'ESFP'  // Explorers (SP)
        ];
        console.log('Initializing event listeners...');
        this.initializeEventListeners();
        console.log('Initializing Firebase...');
        this.initializeFirebase();
        console.log('TeacherMBTIManagementSystem constructor completed');
    }

    initializeEventListeners() {
        console.log('Setting up event listeners...');
        
        // Test if all required elements exist
        const requiredElements = [
            'refreshData', 'exportMBTIGroups', 'exportMBTIStats', 'clearAllData',
            'sortBy', 'searchInput', 'filterByType', 'prevPage', 'nextPage', 
            'pageSize', 'generateMBTIGroups', 'confirmYes', 'confirmNo'
        ];
        
        requiredElements.forEach(id => {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`Required element not found: ${id}`);
            } else {
                console.log(`Found element: ${id}`);
            }
        });
        
        // Navigation controls
        document.getElementById('refreshData').addEventListener('click', () => this.refreshData());
        document.getElementById('exportMBTIGroups').addEventListener('click', () => this.exportMBTIGroupsToExcel());
        document.getElementById('exportMBTIStats').addEventListener('click', () => this.exportMBTIStatsToExcel());
        document.getElementById('clearAllData').addEventListener('click', () => this.confirmClearAllData());



        // Student list controls
        document.getElementById('sortBy').addEventListener('change', () => this.sortAndDisplayStudents());
        document.getElementById('searchInput').addEventListener('input', () => this.searchStudents());
        document.getElementById('filterByType').addEventListener('change', () => this.filterStudents());
        
        // Pagination controls
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        document.getElementById('pageSize').addEventListener('change', () => this.changePageSize());

        // MBTI Grouping controls
        const generateBtn = document.getElementById('generateMBTIGroups');
        const regenerateBtn = document.getElementById('regenerateMBTIGroups');
        
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                console.log('Generate MBTI Groups button clicked');
                this.generateMBTIGroups();
            });
        } else {
            console.error('Cannot find generateMBTIGroups button');
        }
        
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => {
                console.log('Regenerate MBTI Groups button clicked');
                this.generateMBTIGroups();
            });
        }

        // Modal controls
        document.getElementById('confirmYes').addEventListener('click', () => this.executeConfirmedAction());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideConfirmModal());

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
        
        this.firebaseListenerId = window.firebaseService.onStudentsMBTIChange((firebaseStudents) => {
            console.log('Received Firebase MBTI data update:', firebaseStudents.length, 'records');
            
            // Merge Firebase data and local data
            this.mergeStudentData(firebaseStudents);
            
            // Update display
            this.updateDisplay();
            
            // Show update notification
            this.showNotification(`📊 MBTI data updated - ${this.students.length} students currently`, 'info', 3000);
        });
    }

    mergeStudentData(firebaseStudents) {
        // Get local data
        const localStudents = JSON.parse(localStorage.getItem('studentsMBTIData') || '[]');
        
        // Create a Map to merge data, prioritizing Firebase data
        const studentMap = new Map();
        
        // Add local data first
        localStudents.forEach(student => {
            studentMap.set(student.id, this.ensureMBTIDimensions(student));
        });
        
        // Then add Firebase data (will override local duplicate data)
        firebaseStudents.forEach(student => {
            studentMap.set(student.id, this.ensureMBTIDimensions(student));
        });
        
        // Convert back to array
        this.students = Array.from(studentMap.values());
        this.filteredStudents = [...this.students];
        
        // Update local storage
        localStorage.setItem('studentsMBTIData', JSON.stringify(this.students));
    }

    // Ensure student data has mbtiDimensions field
    ensureMBTIDimensions(student) {
        if (!student.mbtiDimensions && student.mbtiType && student.mbtiType.length === 4) {
            const [e_i, s_n, t_f, j_p] = student.mbtiType.split('');
            student.mbtiDimensions = {
                energyDirection: e_i,
                informationProcessing: s_n,
                decisionMaking: t_f,
                lifestyleApproach: j_p
            };
        }
        return student;
    }

    loadLocalStudentData() {
        try {
            const studentsData = localStorage.getItem('studentsMBTIData');
            const rawStudents = studentsData ? JSON.parse(studentsData) : [];
            
            // Ensure all students have mbtiDimensions
            this.students = rawStudents.map(student => this.ensureMBTIDimensions(student));
            this.filteredStudents = [...this.students];
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading student MBTI data:', error);
            this.students = [];
            this.filteredStudents = [];
            this.updateDisplay();
        }
    }

    refreshData() {
        this.loadLocalStudentData();
        this.showNotification('MBTI data refreshed', 'success');
    }

    updateDisplay() {
        this.updateOverviewCards();
        this.updateMBTIStatistics();
        this.sortAndDisplayStudents();
        this.updateGroupingSection();
    }

    updateOverviewCards() {
        const totalStudents = this.students.length;
        const uniqueTypes = new Set(this.students.map(s => s.mbtiType)).size;
        const typeBalance = this.calculateTypeBalance();
        const lastUpdate = totalStudents > 0 ? 
            this.formatDateTime(Math.max(...this.students.map(s => new Date(s.submitTime).getTime()))) : '-';

        document.getElementById('totalMBTIStudents').textContent = totalStudents;
        document.getElementById('uniqueMBTITypes').textContent = uniqueTypes;
        document.getElementById('mbtiBalance').textContent = `${typeBalance}%`;
        document.getElementById('lastMBTIUpdate').textContent = lastUpdate;
    }

    calculateTypeBalance() {
        if (this.students.length === 0) return 0;
        
        const typeCounts = {};
        this.students.forEach(student => {
            typeCounts[student.mbtiType] = (typeCounts[student.mbtiType] || 0) + 1;
        });
        
        const counts = Object.values(typeCounts);
        const maxCount = Math.max(...counts);
        const minCount = Math.min(...counts);
        
        // Calculate balance as percentage (higher is more balanced)
        const balance = minCount / maxCount * 100;
        return Math.round(balance);
    }

    updateMBTIStatistics() {
        const statsSection = document.getElementById('mbtiStatisticsSection');
        
        if (this.students.length === 0) {
            statsSection.style.display = 'none';
            return;
        }

        statsSection.style.display = 'block';
        this.updateDimensionStats();
        this.updateMBTITypeGrid();
    }

    updateDimensionStats() {
        const dimensionStats = document.getElementById('dimensionStats');
        
        // Count each dimension
        const dimensions = {
            'E': 0, 'I': 0,  // Energy Direction
            'S': 0, 'N': 0,  // Information Processing
            'T': 0, 'F': 0,  // Decision Making
            'J': 0, 'P': 0   // Lifestyle Approach
        };

        this.students.forEach(student => {
            if (student.mbtiDimensions) {
                dimensions[student.mbtiDimensions.energyDirection]++;
                dimensions[student.mbtiDimensions.informationProcessing]++;
                dimensions[student.mbtiDimensions.decisionMaking]++;
                dimensions[student.mbtiDimensions.lifestyleApproach]++;
            }
        });

        const total = this.students.length;

        dimensionStats.innerHTML = `
            <div class="dimension-stat-group">
                <h3>Energy Direction</h3>
                <div class="stat-bars">
                    <div class="stat-bar">
                        <span class="stat-label">Extraversion (E)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.E / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.E} (${Math.round(dimensions.E / total * 100)}%)</span>
                    </div>
                    <div class="stat-bar">
                        <span class="stat-label">Introversion (I)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.I / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.I} (${Math.round(dimensions.I / total * 100)}%)</span>
                    </div>
                </div>
            </div>
            <div class="dimension-stat-group">
                <h3>Information Processing</h3>
                <div class="stat-bars">
                    <div class="stat-bar">
                        <span class="stat-label">Sensing (S)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.S / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.S} (${Math.round(dimensions.S / total * 100)}%)</span>
                    </div>
                    <div class="stat-bar">
                        <span class="stat-label">Intuition (N)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.N / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.N} (${Math.round(dimensions.N / total * 100)}%)</span>
                    </div>
                </div>
            </div>
            <div class="dimension-stat-group">
                <h3>Decision Making</h3>
                <div class="stat-bars">
                    <div class="stat-bar">
                        <span class="stat-label">Thinking (T)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.T / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.T} (${Math.round(dimensions.T / total * 100)}%)</span>
                    </div>
                    <div class="stat-bar">
                        <span class="stat-label">Feeling (F)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.F / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.F} (${Math.round(dimensions.F / total * 100)}%)</span>
                    </div>
                </div>
            </div>
            <div class="dimension-stat-group">
                <h3>Lifestyle Approach</h3>
                <div class="stat-bars">
                    <div class="stat-bar">
                        <span class="stat-label">Judging (J)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.J / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.J} (${Math.round(dimensions.J / total * 100)}%)</span>
                    </div>
                    <div class="stat-bar">
                        <span class="stat-label">Perceiving (P)</span>
                        <div class="stat-progress">
                            <div class="stat-fill" style="width: ${(dimensions.P / total * 100)}%"></div>
                        </div>
                        <span class="stat-value">${dimensions.P} (${Math.round(dimensions.P / total * 100)}%)</span>
                    </div>
                </div>
            </div>
        `;
    }

    updateMBTITypeGrid() {
        const typeGrid = document.getElementById('mbtiTypeGrid');
        
        // Count each MBTI type
        const typeCounts = {};
        this.mbtiTypes.forEach(type => {
            typeCounts[type] = 0;
        });
        
        this.students.forEach(student => {
            if (typeCounts.hasOwnProperty(student.mbtiType)) {
                typeCounts[student.mbtiType]++;
            }
        });

        const maxCount = Math.max(...Object.values(typeCounts));

        typeGrid.innerHTML = `
            <div class="type-grid-header">
                <h3>MBTI Type Distribution</h3>
            </div>
            <div class="type-grid-content">
                <div class="type-category">
                    <h4>Analysts (NT)</h4>
                    <div class="type-row">
                        ${['INTJ', 'INTP', 'ENTJ', 'ENTP'].map(type => 
                            `<div class="type-cell ${typeCounts[type] > 0 ? 'has-students' : ''}">
                                <div class="type-label">${type}</div>
                                <div class="type-count">${typeCounts[type]}</div>
                                <div class="type-bar">
                                    <div class="type-fill" style="height: ${maxCount > 0 ? (typeCounts[type] / maxCount * 100) : 0}%"></div>
                                </div>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="type-category">
                    <h4>Diplomats (NF)</h4>
                    <div class="type-row">
                        ${['INFJ', 'INFP', 'ENFJ', 'ENFP'].map(type => 
                            `<div class="type-cell ${typeCounts[type] > 0 ? 'has-students' : ''}">
                                <div class="type-label">${type}</div>
                                <div class="type-count">${typeCounts[type]}</div>
                                <div class="type-bar">
                                    <div class="type-fill" style="height: ${maxCount > 0 ? (typeCounts[type] / maxCount * 100) : 0}%"></div>
                                </div>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="type-category">
                    <h4>Sentinels (SJ)</h4>
                    <div class="type-row">
                        ${['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'].map(type => 
                            `<div class="type-cell ${typeCounts[type] > 0 ? 'has-students' : ''}">
                                <div class="type-label">${type}</div>
                                <div class="type-count">${typeCounts[type]}</div>
                                <div class="type-bar">
                                    <div class="type-fill" style="height: ${maxCount > 0 ? (typeCounts[type] / maxCount * 100) : 0}%"></div>
                                </div>
                            </div>`
                        ).join('')}
                    </div>
                </div>
                <div class="type-category">
                    <h4>Explorers (SP)</h4>
                    <div class="type-row">
                        ${['ISTP', 'ISFP', 'ESTP', 'ESFP'].map(type => 
                            `<div class="type-cell ${typeCounts[type] > 0 ? 'has-students' : ''}">
                                <div class="type-label">${type}</div>
                                <div class="type-count">${typeCounts[type]}</div>
                                <div class="type-bar">
                                    <div class="type-fill" style="height: ${maxCount > 0 ? (typeCounts[type] / maxCount * 100) : 0}%"></div>
                                </div>
                            </div>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
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
                case 'mbtiType':
                    return a.mbtiType.localeCompare(b.mbtiType);
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
                const mbtiMatch = student.mbtiType.toLowerCase().includes(searchTerm);
                return nameMatch || mbtiMatch;
            });
        }
        
        this.currentPage = 1; // Reset to first page
        this.filterStudents();
    }

    filterStudents() {
        const filterType = document.getElementById('filterByType').value;
        
        if (filterType) {
            this.filteredStudents = this.filteredStudents.filter(student => 
                student.mbtiType === filterType
            );
        }
        
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
                        <div class="empty-icon">🧠</div>
                        <h3>No MBTI Data Available</h3>
                        <p>No students have submitted MBTI information yet. You can guide students to the MBTI form page.</p>
                        <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                            <a href="student-mbti-form.html" class="cta-btn">Go to Student MBTI Form</a>
                        </div>
                    </div>
                `;
            } else {
                // Search/filter results are empty
                studentsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">🔍</div>
                        <h3>No Matching Students Found</h3>
                        <p>Please try different search keywords or filters</p>
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
            const mbtiTypeDescription = this.getMBTITypeDescription(student.mbtiType);
            const confidenceText = this.getConfidenceText(student.mbtiConfidence);
            
            return `
                <div class="student-card" data-student-id="${student.id}">
                    <div class="student-header">
                        <div class="student-name">${student.name}</div>
                        <div class="student-submit-time">${this.formatDateTime(new Date(student.submitTime).getTime())}</div>
                    </div>
                    <div class="student-mbti-info">
                        <div class="mbti-type-display">
                            <span class="mbti-badge">${student.mbtiType}</span>
                            <span class="mbti-description">${mbtiTypeDescription}</span>
                        </div>
                        <div class="mbti-dimensions">
                            ${student.mbtiDimensions ? `
                                <span class="dimension-badge">${student.mbtiDimensions.energyDirection}</span>
                                <span class="dimension-badge">${student.mbtiDimensions.informationProcessing}</span>
                                <span class="dimension-badge">${student.mbtiDimensions.decisionMaking}</span>
                                <span class="dimension-badge">${student.mbtiDimensions.lifestyleApproach}</span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="student-details">
                        <div class="confidence-level">Confidence: ${confidenceText}</div>
                        ${student.personalityDescription ? `
                            <div class="personality-description">${student.personalityDescription}</div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Update pagination
        this.updatePagination(totalPages);
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
        const generateBtn = document.getElementById('generateMBTIGroups');
        
        if (this.students.length < 2) {
            generateBtn.disabled = true;
            generateBtn.textContent = `Need at least 2 students (Current: ${this.students.length})`;
        } else {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate Balanced Groups';
        }
    }

    generateMBTIGroups() {
        console.log('Starting MBTI group generation...');
        console.log('Current students data:', this.students);
        
        const numGroupsInput = document.getElementById('mbtiGroupCount');
        if (!numGroupsInput) {
            console.error('Cannot find mbtiGroupCount input element');
            this.showNotification('Error: Cannot find group count input', 'error');
            return;
        }
        
        const numGroups = parseInt(numGroupsInput.value);
        console.log('Number of groups:', numGroups);
        console.log('Number of students:', this.students.length);
        
        if (!this.students || this.students.length === 0) {
            this.showNotification('No student data available. Please ensure students have submitted MBTI information.', 'error');
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

        console.log('Creating MBTI-balanced groups...');
        try {
            this.groups = this.createMBTIBalancedGroups(numGroups);
            console.log('MBTI groups created:', this.groups);
            
            this.displayMBTIGroups();
            this.showMBTIGroupStatistics();
            this.saveMBTIGroupAssignments();
            this.showNotification('MBTI-balanced groups generated successfully', 'success');
        } catch (error) {
            console.error('Error generating MBTI groups:', error);
            this.showNotification('Error generating groups: ' + error.message, 'error');
            return;
        }
        
        // Show regroup button
        document.getElementById('generateMBTIGroups').style.display = 'none';
        document.getElementById('regenerateMBTIGroups').style.display = 'inline-block';
        
        document.getElementById('mbtiGroupsContainer').style.display = 'grid';
        document.getElementById('mbtiGroupStats').style.display = 'block';
        document.getElementById('mbtiCompatibilitySection').style.display = 'block';
    }

    createMBTIBalancedGroups(numGroups) {
        console.log('Creating MBTI balanced groups for', numGroups, 'groups');
        const students = [...this.students];
        console.log('Students MBTI data:', students);
        const groups = Array.from({ length: numGroups }, () => []);
        
        // Separate students by each dimension
        const dimensions = {
            energyDirection: { E: [], I: [] },
            informationProcessing: { S: [], N: [] },
            decisionMaking: { T: [], F: [] },
            lifestyleApproach: { J: [], P: [] }
        };

        students.forEach(student => {
            if (student.mbtiDimensions) {
                dimensions.energyDirection[student.mbtiDimensions.energyDirection].push(student);
                dimensions.informationProcessing[student.mbtiDimensions.informationProcessing].push(student);
                dimensions.decisionMaking[student.mbtiDimensions.decisionMaking].push(student);
                dimensions.lifestyleApproach[student.mbtiDimensions.lifestyleApproach].push(student);
            }
        });

        // Distribute students to achieve balance in each dimension
        const studentAssignments = new Map(); // student.id -> groupIndex
        
        // Start with the most constraining dimension (the one with most uneven distribution)
        const dimensionImbalances = Object.keys(dimensions).map(dimName => {
            const dim = dimensions[dimName];
            const keys = Object.keys(dim);
            const counts = keys.map(key => dim[key].length);
            const imbalance = Math.max(...counts) - Math.min(...counts);
            return { name: dimName, imbalance, dimension: dim };
        }).sort((a, b) => b.imbalance - a.imbalance);

        // Process each student, trying to maintain balance
        const unassignedStudents = [...students];
        
        while (unassignedStudents.length > 0) {
            for (let groupIndex = 0; groupIndex < numGroups && unassignedStudents.length > 0; groupIndex++) {
                // Find the best student for this group to maintain balance
                const bestStudent = this.findBestStudentForMBTIGroup(unassignedStudents, groups[groupIndex], groups);
                
                if (bestStudent) {
                    groups[groupIndex].push(bestStudent);
                    const studentIndex = unassignedStudents.indexOf(bestStudent);
                    unassignedStudents.splice(studentIndex, 1);
                }
            }
        }

        return groups;
    }

    findBestStudentForMBTIGroup(availableStudents, currentGroup, allGroups) {
        if (availableStudents.length === 0) return null;
        
        let bestStudent = null;
        let bestScore = -Infinity;

        availableStudents.forEach(student => {
            let score = 0;
            
            // Calculate balance score for each dimension
            if (student.mbtiDimensions) {
                // Count current dimensions in the group
                const groupDimensions = {
                    E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
                };
                
                currentGroup.forEach(member => {
                    if (member.mbtiDimensions) {
                        groupDimensions[member.mbtiDimensions.energyDirection]++;
                        groupDimensions[member.mbtiDimensions.informationProcessing]++;
                        groupDimensions[member.mbtiDimensions.decisionMaking]++;
                        groupDimensions[member.mbtiDimensions.lifestyleApproach]++;
                    }
                });

                // Favor adding students that improve balance
                const dims = student.mbtiDimensions;
                
                // Energy Direction balance
                if (groupDimensions.E > groupDimensions.I && dims.energyDirection === 'I') score += 10;
                if (groupDimensions.I > groupDimensions.E && dims.energyDirection === 'E') score += 10;
                
                // Information Processing balance
                if (groupDimensions.S > groupDimensions.N && dims.informationProcessing === 'N') score += 10;
                if (groupDimensions.N > groupDimensions.S && dims.informationProcessing === 'S') score += 10;
                
                // Decision Making balance
                if (groupDimensions.T > groupDimensions.F && dims.decisionMaking === 'F') score += 10;
                if (groupDimensions.F > groupDimensions.T && dims.decisionMaking === 'T') score += 10;
                
                // Lifestyle Approach balance
                if (groupDimensions.J > groupDimensions.P && dims.lifestyleApproach === 'P') score += 10;
                if (groupDimensions.P > groupDimensions.J && dims.lifestyleApproach === 'J') score += 10;

                // Avoid creating groups with identical MBTI types if possible
                const sameTypeInGroup = currentGroup.some(member => member.mbtiType === student.mbtiType);
                if (sameTypeInGroup) score -= 5;

                // Prefer smaller groups to maintain size balance
                score -= currentGroup.length * 2;
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestStudent = student;
            }
        });

        return bestStudent;
    }

    displayMBTIGroups() {
        const groupsContainer = document.getElementById('mbtiGroupsContainer');
        
        groupsContainer.innerHTML = this.groups.map((group, index) => {
            // Sort group members by MBTI type
            const sortedGroup = [...group].sort((a, b) => a.mbtiType.localeCompare(b.mbtiType));
            
            // Calculate group MBTI statistics
            const groupStats = this.calculateGroupMBTIStats(group);
            
            return `
                <div class="group-card">
                    <div class="group-header">
                        <div class="group-title">Group ${index + 1} (${sortedGroup.length} members)</div>
                        <div class="group-balance">Balance Score: ${groupStats.balanceScore}%</div>
                    </div>
                    <div class="group-mbti-summary">
                        <div class="dimension-summary">
                            <span class="dim-stat">E:${groupStats.dimensions.E} I:${groupStats.dimensions.I}</span>
                            <span class="dim-stat">S:${groupStats.dimensions.S} N:${groupStats.dimensions.N}</span>
                            <span class="dim-stat">T:${groupStats.dimensions.T} F:${groupStats.dimensions.F}</span>
                            <span class="dim-stat">J:${groupStats.dimensions.J} P:${groupStats.dimensions.P}</span>
                        </div>
                    </div>
                    <ul class="group-members">
                        ${sortedGroup.map(student => `
                            <li class="group-member">
                                <div class="member-name">${student.name}</div>
                                <div class="member-mbti">
                                    <span class="mbti-badge">${student.mbtiType}</span>
                                    <span class="mbti-description">${this.getMBTITypeDescription(student.mbtiType)}</span>
                                </div>
                                ${student.personalityDescription ? `
                                    <div class="member-description">${student.personalityDescription}</div>
                                ` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }

    calculateGroupMBTIStats(group) {
        const dimensions = {
            E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0
        };

        group.forEach(student => {
            if (student.mbtiDimensions) {
                dimensions[student.mbtiDimensions.energyDirection]++;
                dimensions[student.mbtiDimensions.informationProcessing]++;
                dimensions[student.mbtiDimensions.decisionMaking]++;
                dimensions[student.mbtiDimensions.lifestyleApproach]++;
            }
        });

        // Calculate balance score (how close each dimension pair is to 50/50)
        const balances = [
            Math.abs(dimensions.E - dimensions.I),
            Math.abs(dimensions.S - dimensions.N),
            Math.abs(dimensions.T - dimensions.F),
            Math.abs(dimensions.J - dimensions.P)
        ];

        const maxImbalance = balances.reduce((sum, balance) => sum + balance, 0);
        const balanceScore = Math.max(0, 100 - (maxImbalance / group.length * 50));

        return {
            dimensions,
            balanceScore: Math.round(balanceScore)
        };
    }

    async saveMBTIGroupAssignments() {
        try {
            // Save group assignments to localStorage for students to access
            localStorage.setItem('mbtiGroupAssignments', JSON.stringify(this.groups));
            
            // Also save to Firebase if available
            if (window.firebaseService && window.firebaseService.initialized) {
                await window.firebaseService.submitMBTIGroupAssignments(this.groups);
                console.log('MBTI group assignments saved to Firebase successfully');
            }
        } catch (error) {
            console.error('Error saving MBTI group assignments:', error);
        }
    }

    showMBTIGroupStatistics() {
        const statsContent = document.getElementById('mbtiStatsContent');
        
        // Calculate statistics
        const totalStudents = this.students.length;
        const numGroups = this.groups.length;
        const avgGroupSize = (totalStudents / numGroups).toFixed(1);
        const groupSizes = this.groups.map(group => group.length);
        const minGroupSize = Math.min(...groupSizes);
        const maxGroupSize = Math.max(...groupSizes);
        
        // Calculate overall balance across all groups
        const overallBalance = this.calculateOverallMBTIBalance();
        
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
                <span class="stat-label">Overall MBTI Balance:</span>
                <span class="stat-value">${overallBalance}%</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Grouping Method:</span>
                <span class="stat-value">MBTI Dimension Balancing</span>
            </div>
        `;
    }

    calculateOverallMBTIBalance() {
        if (this.groups.length === 0) return 100;
        
        const groupBalances = this.groups.map(group => this.calculateGroupMBTIStats(group).balanceScore);
        const avgBalance = groupBalances.reduce((sum, balance) => sum + balance, 0) / groupBalances.length;
        
        return Math.round(avgBalance);
    }

    exportData() {
        try {
            const exportData = {
                students: this.students,
                groups: this.groups,
                exportTime: new Date().toISOString(),
                totalStudents: this.students.length,
                groupCount: this.groups.length,
                dataType: 'mbti'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `mbti_student_data_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            this.showNotification('MBTI data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting MBTI data:', error);
            this.showNotification('Data export failed', 'error');
        }
    }

    exportMBTIGroupsToExcel() {
        if (this.groups.length === 0) {
            this.showNotification('No MBTI groups available to export. Please generate groups first.', 'error');
            return;
        }

        try {
            // Create CSV content for MBTI groups
            let csvContent = 'Group Number,Student Name,MBTI Type,Type Description,Dimensions (E/I-S/N-T/F-J/P),Confidence Level,Personality Description\n';
            
            this.groups.forEach((group, groupIndex) => {
                // Sort group members by MBTI type
                const sortedGroup = [...group].sort((a, b) => a.mbtiType.localeCompare(b.mbtiType));
                
                sortedGroup.forEach(student => {
                    const typeDescription = this.getMBTITypeDescription(student.mbtiType);
                    const dimensions = student.mbtiDimensions ? 
                        `${student.mbtiDimensions.energyDirection}/${student.mbtiDimensions.informationProcessing}-${student.mbtiDimensions.decisionMaking}/${student.mbtiDimensions.lifestyleApproach}` : '';
                    const confidence = this.getConfidenceText(student.mbtiConfidence);
                    const description = student.personalityDescription || '';
                    
                    csvContent += `Group ${groupIndex + 1},"${student.name}","${student.mbtiType}","${typeDescription}","${dimensions}","${confidence}","${description}"\n`;
                });
                
                // Add empty row between groups
                if (groupIndex < this.groups.length - 1) {
                    csvContent += '\n';
                }
            });

            // Add group statistics
            csvContent += '\n\nGroup Statistics\n';
            csvContent += 'Group,Size,E,I,S,N,T,F,J,P,Balance Score\n';
            
            this.groups.forEach((group, index) => {
                const stats = this.calculateGroupMBTIStats(group);
                csvContent += `Group ${index + 1},${group.length},${stats.dimensions.E},${stats.dimensions.I},${stats.dimensions.S},${stats.dimensions.N},${stats.dimensions.T},${stats.dimensions.F},${stats.dimensions.J},${stats.dimensions.P},${stats.balanceScore}%\n`;
            });

            this.downloadCSV(csvContent, `mbti_group_results_${new Date().toISOString().split('T')[0]}.csv`);
            this.showNotification('MBTI group results exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting MBTI groups:', error);
            this.showNotification('Failed to export MBTI group results', 'error');
        }
    }

    exportMBTIStatsToExcel() {
        if (this.students.length === 0) {
            this.showNotification('No MBTI data available to export.', 'error');
            return;
        }

        try {
            // Create CSV content for MBTI statistics
            let csvContent = 'MBTI Statistics Report\n\n';
            
            // Overall statistics
            csvContent += 'Overall Statistics\n';
            csvContent += 'Metric,Value\n';
            csvContent += `Total Students,${this.students.length}\n`;
            csvContent += `Unique MBTI Types,${new Set(this.students.map(s => s.mbtiType)).size}\n`;
            csvContent += `Type Balance Score,${this.calculateTypeBalance()}%\n\n`;

            // Dimension distribution
            csvContent += 'MBTI Dimension Distribution\n';
            csvContent += 'Dimension,Option,Count,Percentage\n';
            
            const dimensionCounts = {
                'E': 0, 'I': 0, 'S': 0, 'N': 0, 'T': 0, 'F': 0, 'J': 0, 'P': 0
            };

            this.students.forEach(student => {
                if (student.mbtiDimensions) {
                    dimensionCounts[student.mbtiDimensions.energyDirection]++;
                    dimensionCounts[student.mbtiDimensions.informationProcessing]++;
                    dimensionCounts[student.mbtiDimensions.decisionMaking]++;
                    dimensionCounts[student.mbtiDimensions.lifestyleApproach]++;
                }
            });

            const total = this.students.length;
            csvContent += `Energy Direction,Extraversion (E),${dimensionCounts.E},${Math.round(dimensionCounts.E / total * 100)}%\n`;
            csvContent += `Energy Direction,Introversion (I),${dimensionCounts.I},${Math.round(dimensionCounts.I / total * 100)}%\n`;
            csvContent += `Information Processing,Sensing (S),${dimensionCounts.S},${Math.round(dimensionCounts.S / total * 100)}%\n`;
            csvContent += `Information Processing,Intuition (N),${dimensionCounts.N},${Math.round(dimensionCounts.N / total * 100)}%\n`;
            csvContent += `Decision Making,Thinking (T),${dimensionCounts.T},${Math.round(dimensionCounts.T / total * 100)}%\n`;
            csvContent += `Decision Making,Feeling (F),${dimensionCounts.F},${Math.round(dimensionCounts.F / total * 100)}%\n`;
            csvContent += `Lifestyle Approach,Judging (J),${dimensionCounts.J},${Math.round(dimensionCounts.J / total * 100)}%\n`;
            csvContent += `Lifestyle Approach,Perceiving (P),${dimensionCounts.P},${Math.round(dimensionCounts.P / total * 100)}%\n\n`;

            // Type distribution
            csvContent += 'MBTI Type Distribution\n';
            csvContent += 'Type,Description,Count,Percentage\n';
            
            const typeCounts = {};
            this.mbtiTypes.forEach(type => {
                typeCounts[type] = 0;
            });
            
            this.students.forEach(student => {
                if (typeCounts.hasOwnProperty(student.mbtiType)) {
                    typeCounts[student.mbtiType]++;
                }
            });

            this.mbtiTypes.forEach(type => {
                const description = this.getMBTITypeDescription(type);
                const count = typeCounts[type];
                const percentage = Math.round(count / total * 100);
                csvContent += `${type},"${description}",${count},${percentage}%\n`;
            });

            this.downloadCSV(csvContent, `mbti_statistics_${new Date().toISOString().split('T')[0]}.csv`);
            this.showNotification('MBTI statistics exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting MBTI statistics:', error);
            this.showNotification('Failed to export MBTI statistics', 'error');
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
        this.showConfirmModal('Are you sure you want to clear all MBTI data?', 'This operation will permanently delete all student MBTI information and group results from Firebase, and cannot be undone.');
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
            await window.firebaseService.clearAllMBTIData();
            
            // 清理本地存储
            localStorage.removeItem('studentsMBTIData');
            localStorage.removeItem('currentMBTIStudentId');
            localStorage.removeItem('studentMBTIFormDraft');
            localStorage.removeItem('mbtiGroupAssignments');
            
            // 清理内存中的数据
            this.students = [];
            this.groups = [];
            this.filteredStudents = [];
            
            this.updateDisplay();
            
            // Hide grouping related content
            document.getElementById('mbtiGroupsContainer').style.display = 'none';
            document.getElementById('mbtiGroupStats').style.display = 'none';
            document.getElementById('mbtiCompatibilitySection').style.display = 'none';
            document.getElementById('generateMBTIGroups').style.display = 'inline-block';
            document.getElementById('regenerateMBTIGroups').style.display = 'none';
            
            this.showNotification('All MBTI data cleared from Firebase successfully', 'success');
        } catch (error) {
            console.error('Error clearing MBTI data from Firebase:', error);
            this.showNotification('Failed to clear MBTI data from Firebase', 'error');
        }
    }

    clearAllData() {
        try {
            localStorage.removeItem('studentsMBTIData');
            localStorage.removeItem('currentMBTIStudentId');
            localStorage.removeItem('studentMBTIFormDraft');
            localStorage.removeItem('mbtiGroupAssignments');
            
            this.students = [];
            this.groups = [];
            this.filteredStudents = [];
            
            this.updateDisplay();
            
            // Hide grouping related content
            document.getElementById('mbtiGroupsContainer').style.display = 'none';
            document.getElementById('mbtiGroupStats').style.display = 'none';
            document.getElementById('mbtiCompatibilitySection').style.display = 'none';
            document.getElementById('generateMBTIGroups').style.display = 'inline-block';
            document.getElementById('regenerateMBTIGroups').style.display = 'none';
            
            this.showNotification('All MBTI data cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing MBTI data:', error);
            this.showNotification('Failed to clear MBTI data', 'error');
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

    showNotification(message, type = 'info', duration = 5000) {
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
            max-width: 350px;
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
        }, duration);
    }


}

// Initialize system after page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing TeacherMBTIManagementSystem...');
    try {
        window.teacherMBTISystem = new TeacherMBTIManagementSystem();
        console.log('TeacherMBTIManagementSystem initialized successfully');
    } catch (error) {
        console.error('Error initializing TeacherMBTIManagementSystem:', error);
    }
});
