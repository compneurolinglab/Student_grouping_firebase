class TeacherManagementSystem {
    constructor() {
        this.students = [];
        this.groups = [];
        this.filteredStudents = [];
        this.currentPage = 1;
        this.pageSize = 50;
        this.firebaseListenerId = null;
        this.initializeEventListeners();
        this.initializeFirebase();
    }

    initializeEventListeners() {
        // 导航控制
        document.getElementById('refreshData').addEventListener('click', () => this.refreshData());
        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('exportGroups').addEventListener('click', () => this.exportGroupsToExcel());
        document.getElementById('exportBirthdays').addEventListener('click', () => this.exportBirthdaysToExcel());
        document.getElementById('clearAllData').addEventListener('click', () => this.confirmClearAllData());

        // 学生列表控制
        document.getElementById('sortBy').addEventListener('change', () => this.sortAndDisplayStudents());
        document.getElementById('searchInput').addEventListener('input', () => this.searchStudents());
        
        // 分页控制
        document.getElementById('prevPage').addEventListener('click', () => this.prevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.nextPage());
        document.getElementById('pageSize').addEventListener('change', () => this.changePageSize());

        // 分组控制
        document.getElementById('generateGroups').addEventListener('click', () => this.generateGroups());
        document.getElementById('regenerateGroups')?.addEventListener('click', () => this.generateGroups());

        // 模态框控制
        document.getElementById('confirmYes').addEventListener('click', () => this.executeConfirmedAction());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideConfirmModal());

        // 定期刷新数据
        setInterval(() => this.refreshData(), 30000); // 每30秒刷新一次
    }

    async initializeFirebase() {
        try {
            // 先加载本地数据
            this.loadLocalStudentData();
            
            // 尝试初始化Firebase
            const firebaseReady = await window.firebaseService.initialize();
            
            if (firebaseReady) {
                console.log('Firebase已连接，开始实时同步');
                this.setupFirebaseListener();
                this.showNotification('🔥 Firebase已连接，实时同步已启用', 'success');
            } else {
                console.log('Firebase未配置，使用本地数据');
                this.showNotification('📱 使用本地数据模式', 'info');
            }
            
        } catch (error) {
            console.error('Firebase初始化失败:', error);
            this.showNotification('⚠️ 云端同步不可用，使用本地数据', 'warning');
        }
    }

    setupFirebaseListener() {
        if (this.firebaseListenerId) {
            window.firebaseService.removeListener(this.firebaseListenerId);
        }
        
        this.firebaseListenerId = window.firebaseService.onStudentsChange((firebaseStudents) => {
            console.log('收到Firebase数据更新:', firebaseStudents.length, '条记录');
            
            // 合并Firebase数据和本地数据
            this.mergeStudentData(firebaseStudents);
            
            // 更新显示
            this.updateDisplay();
            
            // 显示更新通知
            this.showNotification(`📊 数据已更新 - 当前${this.students.length}名学生`, 'info', 3000);
        });
    }

    mergeStudentData(firebaseStudents) {
        // 获取本地数据
        const localStudents = JSON.parse(localStorage.getItem('studentsData') || '[]');
        
        // 创建一个Map来合并数据，优先使用Firebase数据
        const studentMap = new Map();
        
        // 先添加本地数据
        localStudents.forEach(student => {
            studentMap.set(student.id, student);
        });
        
        // 然后添加Firebase数据（会覆盖本地的重复数据）
        firebaseStudents.forEach(student => {
            studentMap.set(student.id, student);
        });
        
        // 转换回数组
        this.students = Array.from(studentMap.values());
        this.filteredStudents = [...this.students];
        
        // 更新本地存储
        localStorage.setItem('studentsData', JSON.stringify(this.students));
    }

    loadLocalStudentData() {
        try {
            const studentsData = localStorage.getItem('studentsData');
            this.students = studentsData ? JSON.parse(studentsData) : [];
            this.filteredStudents = [...this.students];
            this.updateDisplay();
        } catch (error) {
            console.error('Error loading student data:', error);
            this.students = [];
            this.filteredStudents = [];
            this.updateDisplay();
        }
    }

    loadStudentData() {
        // 保持向后兼容
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
                // 没有任何学生数据
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
                // 搜索结果为空
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
        const numGroups = parseInt(document.getElementById('groupCount').value);
        console.log('Number of groups:', numGroups);
        console.log('Number of students:', this.students.length);
        
        if (this.students.length < numGroups) {
            this.showNotification('Number of groups cannot exceed total number of students', 'error');
            return;
        }

        if (this.students.length < 2) {
            this.showNotification('At least 2 students are required for grouping', 'error');
            return;
        }

        // 不再需要年龄信息，直接进行分组
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
        
        // 显示重新分组按钮
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
        
        // 创建相似度矩阵
        console.log('Creating similarity matrix...');
        const similarityMatrix = this.createSimilarityMatrix(students);
        console.log('Similarity matrix created');
        
        // 找到最多样化的种子学生
        const seeds = this.findDiverseSeeds(students, similarityMatrix, numGroups);
        
        // 将种子分配到各组
        seeds.forEach((seedIndex, groupIndex) => {
            groups[groupIndex].push(students[seedIndex]);
            students[seedIndex] = null; // 标记为已分配
        });
        
        // 分配剩余学生
        const remainingStudents = students.filter(student => student !== null);
        
        remainingStudents.forEach(student => {
            const bestGroupIndex = this.findBestGroup(student, groups);
            groups[bestGroupIndex].push(student);
        });
        
        // 平衡组大小
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
        // 只基于兴趣相似度进行分组
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
        
        // 找到平均相似度最低的学生作为第一个种子
        let firstSeed = 0;
        let lowestAvgSimilarity = Infinity;
        
        for (let i = 0; i < students.length; i++) {
            const avgSimilarity = similarityMatrix[i].reduce((sum, sim) => sum + sim, 0) / students.length;
            if (avgSimilarity < lowestAvgSimilarity) {
                lowestAvgSimilarity = avgSimilarity;
                firstSeed = i;
            }
        }
        
        seeds.push(firstSeed);
        
        // 找到与已选种子距离最远的其他种子
        for (let seedCount = 1; seedCount < numGroups; seedCount++) {
            let nextSeed = 0;
            let maxMinDistance = 0;
            
            for (let i = 0; i < students.length; i++) {
                if (seeds.includes(i)) continue;
                
                const minDistance = Math.min(...seeds.map(seedIndex => 1 - similarityMatrix[i][seedIndex]));
                
                if (minDistance > maxMinDistance) {
                    maxMinDistance = minDistance;
                    nextSeed = i;
                }
            }
            
            seeds.push(nextSeed);
        }
        
        return seeds;
    }

    findBestGroup(student, groups) {
        let bestGroupIndex = 0;
        let lowestScore = Infinity;
        
        groups.forEach((group, groupIndex) => {
            if (group.length === 0) return;
            
            const avgSimilarity = group.reduce((sum, groupMember) => {
                return sum + this.calculateSimilarity(student, groupMember);
            }, 0) / group.length;
            
            // 考虑组大小平衡，偏向较小的组
            const sizePenalty = group.length * 0.1;
            const score = avgSimilarity + sizePenalty;
            
            if (score < lowestScore) {
                lowestScore = score;
                bestGroupIndex = groupIndex;
            }
        });
        
        return bestGroupIndex;
    }

    balanceGroupSizes(groups) {
        const totalStudents = groups.reduce((sum, group) => sum + group.length, 0);
        const idealGroupSize = Math.floor(totalStudents / groups.length);
        const remainder = totalStudents % groups.length;
        
        // 移动学生以平衡组大小
        for (let i = 0; i < groups.length; i++) {
            const targetSize = idealGroupSize + (i < remainder ? 1 : 0);
            
            while (groups[i].length > targetSize + 1) {
                // 找到最小的组
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
            // 按出生日期排序组内成员
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

    saveGroupAssignments() {
        try {
            // Save group assignments to localStorage for students to access
            localStorage.setItem('groupAssignments', JSON.stringify(this.groups));
        } catch (error) {
            console.error('Error saving group assignments:', error);
        }
    }

    showGroupStatistics() {
        const statsContent = document.getElementById('statsContent');
        
        // 计算统计信息
        const totalStudents = this.students.length;
        const numGroups = this.groups.length;
        const avgGroupSize = (totalStudents / numGroups).toFixed(1);
        const groupSizes = this.groups.map(group => group.length);
        const minGroupSize = Math.min(...groupSizes);
        const maxGroupSize = Math.max(...groupSizes);
        
        // 计算组内平均相似度
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
        const balance = Math.max(0, 100 - (variance * 20)); // 转换为百分比
        
        return balance.toFixed(1);
    }

    updateInterestAnalysis() {
        const analysisSection = document.getElementById('analysisSection');
        const interestAnalysis = document.getElementById('interestAnalysis');
        
        if (this.students.length === 0) {
            analysisSection.style.display = 'none';
            return;
        }

        // 统计兴趣分布
        const interestCounts = {};
        this.students.forEach(student => {
            (student.interests || []).forEach(interest => {
                const normalizedInterest = interest.trim();
                if (normalizedInterest) {
                    interestCounts[normalizedInterest] = (interestCounts[normalizedInterest] || 0) + 1;
                }
            });
        });

        // 按数量排序
        const sortedInterests = Object.entries(interestCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 15); // 只显示前15个

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

        // 按生日分组
        const birthdayGroups = {};
        this.students.forEach(student => {
            const birthDate = student.birthDate && student.birthDate.formatted ? student.birthDate.formatted : 'Unknown';
            if (!birthdayGroups[birthDate]) {
                birthdayGroups[birthDate] = [];
            }
            birthdayGroups[birthDate].push(student);
        });

        // 只显示有多个学生的生日
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
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (this.students.length === 0) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(canvas.width, canvas.height) * 0.35;
        
        // 计算学生位置（圆形排列）
        const studentPositions = this.students.map((student, index) => {
            const angle = (2 * Math.PI * index) / this.students.length;
            return {
                student: student,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });

        // 绘制连接线（基于兴趣相似度）
        ctx.strokeStyle = '#cbd5e0';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < studentPositions.length; i++) {
            for (let j = i + 1; j < studentPositions.length; j++) {
                const pos1 = studentPositions[i];
                const pos2 = studentPositions[j];
                const similarity = this.calculateSimilarity(pos1.student, pos2.student);
                
                // 只显示相似度大于0的连接
                if (similarity > 0) {
                    const alpha = similarity * 0.8 + 0.2; // 透明度基于相似度
                    const lineWidth = similarity * 3 + 1; // 线宽基于相似度
                    
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

        // 重置透明度
        ctx.globalAlpha = 1;

        // 绘制学生节点
        studentPositions.forEach((pos, index) => {
            // 绘制圆圈
            ctx.fillStyle = '#667eea';
            ctx.strokeStyle = '#4c51bf';
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 15, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();

            // 绘制学生姓名
            ctx.fillStyle = '#2d3748';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            
            const nameWidth = ctx.measureText(pos.student.name).width;
            const textX = pos.x;
            const textY = pos.y > centerY ? pos.y + 30 : pos.y - 20;
            
            // 绘制文本背景
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillRect(textX - nameWidth/2 - 3, textY - 12, nameWidth + 6, 16);
            
            // 绘制文本
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
        this.showConfirmModal('Are you sure you want to clear all student data?', 'This operation will delete all student information and group results, and cannot be undone.');
    }

    executeConfirmedAction() {
        if (this.pendingAction === 'clearAll') {
            this.clearAllData();
        }
        this.hideConfirmModal();
    }

    clearAllData() {
        try {
            localStorage.removeItem('studentsData');
            localStorage.removeItem('currentStudentId');
            localStorage.removeItem('studentFormDraft');
            localStorage.removeItem('groupAssignments');
            
            this.students = [];
            this.groups = [];
            this.filteredStudents = [];
            
            this.updateDisplay();
            
            // 隐藏分组相关内容
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
        // 创建通知元素
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

        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// 页面加载完成后初始化系统
document.addEventListener('DOMContentLoaded', () => {
    new TeacherManagementSystem();
});
