// Firebase Configuration File
// Replace with your Firebase project configuration

// Firebase configuration object - Get from Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyAYh6xxtTowfzp_8sg2S4Y15OAA8fvC3PQ",
    authDomain: "student-grouping-system-5273a.firebaseapp.com",
    databaseURL: "https://student-grouping-system-5273a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "student-grouping-system-5273a",
    storageBucket: "student-grouping-system-5273a.firebasestorage.app",
    messagingSenderId: "501829087755",
    appId: "1:501829087755:web:c5ff7191d0eeb23b89cd0e",
    measurementId: "G-FMECN9FT2G"
};

// Firebase Service Class
class FirebaseService {
    constructor() {
        this.app = null;
        this.database = null;
        this.initialized = false;
        this.listeners = new Map();
    }

    // Initialize Firebase
    async initialize() {
        try {
            // Check if Firebase SDK is loaded
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded, using localStorage only');
                return false;
            }

            // Check if Firebase is configured
            if (firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
                console.warn('Firebase not configured, using localStorage only');
                return false;
            }

            // Initialize Firebase app
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(firebaseConfig);
            } else {
                this.app = firebase.app();
            }

            // Get database reference
            this.database = firebase.database();
            this.initialized = true;
            
            console.log('Firebase initialized successfully');
            return true;
        } catch (error) {
            console.warn('Firebase initialization failed, using localStorage:', error.message);
            return false;
        }
    }

    // Check for duplicate student based on name and birth date
    async checkDuplicateStudent(name, birthDate) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const studentsRef = this.database.ref('students');
            const snapshot = await studentsRef.once('value');
            const students = snapshot.val();
            
            if (!students) return null;
            
            // Find existing student with same name and birth date
            for (const firebaseId in students) {
                const student = students[firebaseId];
                if (student.name === name && 
                    student.birthDate && 
                    student.birthDate.month === birthDate.month && 
                    student.birthDate.day === birthDate.day) {
                    return { ...student, firebaseId };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to check duplicate student:', error);
            throw error;
        }
    }

    // Submit student data (with duplicate check)
    async submitStudent(studentData, allowUpdate = true) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            // Check for existing student
            const existingStudent = await this.checkDuplicateStudent(studentData.name, studentData.birthDate);
            
            if (existingStudent && allowUpdate) {
                // Update existing record
                const studentsRef = this.database.ref(`students/${existingStudent.firebaseId}`);
                const dataToSave = {
                    ...studentData,
                    firebaseId: existingStudent.firebaseId,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    submitTime: new Date().toISOString(),
                    originalSubmitTime: existingStudent.originalSubmitTime || existingStudent.submitTime,
                    updateCount: (existingStudent.updateCount || 0) + 1
                };
                
                await studentsRef.set(dataToSave);
                console.log('Student data updated in Firebase successfully:', dataToSave);
                return { firebaseId: existingStudent.firebaseId, isUpdate: true, updateCount: dataToSave.updateCount };
            } else if (existingStudent && !allowUpdate) {
                // Return existing student info without updating
                return { firebaseId: existingStudent.firebaseId, isDuplicate: true, existingData: existingStudent };
            } else {
                // Create new record
                const studentsRef = this.database.ref('students');
                const newStudentRef = studentsRef.push();
                
                const dataToSave = {
                    ...studentData,
                    firebaseId: newStudentRef.key,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    submitTime: new Date().toISOString(),
                    originalSubmitTime: new Date().toISOString(),
                    updateCount: 0
                };
                
                await newStudentRef.set(dataToSave);
                console.log('Student data submitted to Firebase successfully:', dataToSave);
                return { firebaseId: newStudentRef.key, isNew: true };
            }
        } catch (error) {
            console.error('Failed to submit student data to Firebase:', error);
            throw error;
        }
    }

    // Get all student data (one-time)
    async getAllStudents() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const snapshot = await this.database.ref('students').once('value');
            const data = snapshot.val();
            
            if (!data) return [];
            
            // Convert to array format
            const students = Object.keys(data).map(key => ({
                ...data[key],
                firebaseId: key
            }));
            
            console.log('Retrieved student data from Firebase:', students.length, 'records');
            return students;
        } catch (error) {
            console.error('Failed to retrieve student data from Firebase:', error);
            throw error;
        }
    }

    // Listen to real-time student data changes
    onStudentsChange(callback) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        const studentsRef = this.database.ref('students');
        
        const listener = studentsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const students = data ? Object.keys(data).map(key => ({
                ...data[key],
                firebaseId: key
            })) : [];
            
            console.log('Firebase real-time data update:', students.length, 'records');
            callback(students);
        });
        
        // Store listener reference
        const listenerId = 'students_' + Date.now();
        this.listeners.set(listenerId, { ref: studentsRef, listener });
        
        return listenerId;
    }

    // Remove listener
    removeListener(listenerId) {
        const listenerInfo = this.listeners.get(listenerId);
        if (listenerInfo) {
            listenerInfo.ref.off('value', listenerInfo.listener);
            this.listeners.delete(listenerId);
            console.log('Removed Firebase listener:', listenerId);
        }
    }

    // Clean up all listeners
    cleanup() {
        this.listeners.forEach((listenerInfo, listenerId) => {
            this.removeListener(listenerId);
        });
        console.log('Firebase service cleaned up');
    }

    // Submit group assignments
    async submitGroupAssignments(groups) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const groupsRef = this.database.ref('groupAssignments');
            const groupData = {
                groups: groups,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                createdAt: new Date().toISOString()
            };
            
            await groupsRef.set(groupData);
            console.log('Group assignments submitted to Firebase successfully:', groupData);
            return true;
        } catch (error) {
            console.error('Failed to submit group assignments to Firebase:', error);
            throw error;
        }
    }

    // Get current group assignments
    async getGroupAssignments() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const snapshot = await this.database.ref('groupAssignments').once('value');
            const data = snapshot.val();
            
            if (!data) return null;
            
            console.log('Retrieved group assignments from Firebase');
            return data;
        } catch (error) {
            console.error('Failed to retrieve group assignments from Firebase:', error);
            throw error;
        }
    }

    // Listen to group assignment changes
    onGroupAssignmentsChange(callback) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        const groupsRef = this.database.ref('groupAssignments');
        
        const listener = groupsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            console.log('Group assignments updated from Firebase');
            callback(data);
        });
        
        // Store listener reference
        const listenerId = 'groups_' + Date.now();
        this.listeners.set(listenerId, { ref: groupsRef, listener });
        
        return listenerId;
    }

    // Check for duplicate MBTI student based on name only
    async checkDuplicateStudentMBTI(name) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const studentsRef = this.database.ref('studentsMBTI');
            const snapshot = await studentsRef.once('value');
            const students = snapshot.val();
            
            if (!students) return null;
            
            // Find existing student with same name
            for (const firebaseId in students) {
                const student = students[firebaseId];
                if (student.name === name) {
                    return { ...student, firebaseId };
                }
            }
            
            return null;
        } catch (error) {
            console.error('Failed to check duplicate MBTI student:', error);
            throw error;
        }
    }

    // Submit student MBTI data (with duplicate check)
    async submitStudentMBTI(studentData, allowUpdate = true) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            // Check for existing student
            const existingStudent = await this.checkDuplicateStudentMBTI(studentData.name);
            
            if (existingStudent && allowUpdate) {
                // Update existing record
                const studentsRef = this.database.ref(`studentsMBTI/${existingStudent.firebaseId}`);
                const dataToSave = {
                    ...studentData,
                    firebaseId: existingStudent.firebaseId,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    submitTime: new Date().toISOString(),
                    originalSubmitTime: existingStudent.originalSubmitTime || existingStudent.submitTime,
                    updateCount: (existingStudent.updateCount || 0) + 1
                };
                
                await studentsRef.set(dataToSave);
                console.log('Student MBTI data updated in Firebase successfully:', dataToSave);
                return { firebaseId: existingStudent.firebaseId, isUpdate: true, updateCount: dataToSave.updateCount };
            } else if (existingStudent && !allowUpdate) {
                // Return existing student info without updating
                return { firebaseId: existingStudent.firebaseId, isDuplicate: true, existingData: existingStudent };
            } else {
                // Create new record
                const studentsRef = this.database.ref('studentsMBTI');
                const newStudentRef = studentsRef.push();
                
                const dataToSave = {
                    ...studentData,
                    firebaseId: newStudentRef.key,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    submitTime: new Date().toISOString(),
                    originalSubmitTime: new Date().toISOString(),
                    updateCount: 0
                };
                
                await newStudentRef.set(dataToSave);
                console.log('Student MBTI data submitted to Firebase successfully:', dataToSave);
                return { firebaseId: newStudentRef.key, isNew: true };
            }
        } catch (error) {
            console.error('Failed to submit student MBTI data to Firebase:', error);
            throw error;
        }
    }

    // Get all student MBTI data (one-time)
    async getAllStudentsMBTI() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const snapshot = await this.database.ref('studentsMBTI').once('value');
            const data = snapshot.val();
            
            if (!data) return [];
            
            // Convert to array format
            const students = Object.keys(data).map(key => ({
                ...data[key],
                firebaseId: key
            }));
            
            console.log('Retrieved student MBTI data from Firebase:', students.length, 'records');
            return students;
        } catch (error) {
            console.error('Failed to retrieve student MBTI data from Firebase:', error);
            throw error;
        }
    }

    // Listen to real-time student MBTI data changes
    onStudentsMBTIChange(callback) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        const studentsRef = this.database.ref('studentsMBTI');
        
        const listener = studentsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const students = data ? Object.keys(data).map(key => ({
                ...data[key],
                firebaseId: key
            })) : [];
            
            console.log('Firebase real-time MBTI data update:', students.length, 'records');
            callback(students);
        });
        
        // Store listener reference
        const listenerId = 'studentsMBTI_' + Date.now();
        this.listeners.set(listenerId, { ref: studentsRef, listener });
        
        return listenerId;
    }

    // Submit MBTI group assignments
    async submitMBTIGroupAssignments(groups) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const groupsRef = this.database.ref('mbtiGroupAssignments');
            const groupData = {
                groups: groups,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                createdAt: new Date().toISOString()
            };
            
            await groupsRef.set(groupData);
            console.log('MBTI group assignments submitted to Firebase successfully:', groupData);
            return true;
        } catch (error) {
            console.error('Failed to submit MBTI group assignments to Firebase:', error);
            throw error;
        }
    }

    // Get current MBTI group assignments
    async getMBTIGroupAssignments() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const snapshot = await this.database.ref('mbtiGroupAssignments').once('value');
            const data = snapshot.val();
            
            if (!data) return null;
            
            console.log('Retrieved MBTI group assignments from Firebase');
            return data;
        } catch (error) {
            console.error('Failed to retrieve MBTI group assignments from Firebase:', error);
            throw error;
        }
    }

    // Listen to MBTI group assignment changes
    onMBTIGroupAssignmentsChange(callback) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        const groupsRef = this.database.ref('mbtiGroupAssignments');
        
        const listener = groupsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            console.log('MBTI group assignments updated from Firebase');
            callback(data);
        });
        
        // Store listener reference
        const listenerId = 'mbtiGroups_' + Date.now();
        this.listeners.set(listenerId, { ref: groupsRef, listener });
        
        return listenerId;
    }

    // Get connection status
    onConnectionChange(callback) {
        if (!this.initialized) return;
        
        const connectedRef = this.database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            const connected = snapshot.val() === true;
            console.log('Firebase connection status:', connected ? 'Connected' : 'Disconnected');
            callback(connected);
        });
    }

    // 删除所有兴趣数据
    async clearAllInterestsData() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            await this.database.ref('students').remove();
            await this.database.ref('groupAssignments').remove();
            console.log('All interests data cleared from Firebase');
            return true;
        } catch (error) {
            console.error('Error clearing interests data:', error);
            throw error;
        }
    }

    // 删除所有MBTI数据
    async clearAllMBTIData() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            await this.database.ref('studentsMBTI').remove();
            await this.database.ref('mbtiGroupAssignments').remove();
            console.log('All MBTI data cleared from Firebase');
            return true;
        } catch (error) {
            console.error('Error clearing MBTI data:', error);
            throw error;
        }
    }


}

// Create global Firebase service instance
window.firebaseService = new FirebaseService();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.firebaseService) {
        window.firebaseService.cleanup();
    }
});