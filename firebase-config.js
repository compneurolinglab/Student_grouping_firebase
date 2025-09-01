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

    // Submit student data
    async submitStudent(studentData) {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const studentsRef = this.database.ref('students');
            const newStudentRef = studentsRef.push();
            
            const dataToSave = {
                ...studentData,
                firebaseId: newStudentRef.key,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                submitTime: new Date().toISOString()
            };
            
            await newStudentRef.set(dataToSave);
            console.log('Student data submitted to Firebase successfully:', dataToSave);
            return newStudentRef.key;
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
}

// Create global Firebase service instance
window.firebaseService = new FirebaseService();

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.firebaseService) {
        window.firebaseService.cleanup();
    }
});