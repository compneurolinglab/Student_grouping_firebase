// Firebase配置文件
// 请替换为你的Firebase项目配置

// Firebase配置对象 - 从Firebase控制台获取
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

// Firebase服务类
class FirebaseService {
    constructor() {
        this.app = null;
        this.database = null;
        this.initialized = false;
        this.listeners = new Map();
    }

    // 初始化Firebase
    async initialize() {
        try {
            // 检查Firebase SDK是否已加载
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded, using localStorage only');
                return false;
            }

            // 检查是否配置了Firebase
            if (firebaseConfig.apiKey === 'YOUR_API_KEY_HERE') {
                console.warn('Firebase not configured, using localStorage only');
                return false;
            }

            // 初始化Firebase应用
            if (!firebase.apps.length) {
                this.app = firebase.initializeApp(firebaseConfig);
            } else {
                this.app = firebase.app();
            }

            // 获取数据库引用
            this.database = firebase.database();
            this.initialized = true;
            
            console.log('Firebase初始化成功');
            return true;
        } catch (error) {
            console.warn('Firebase初始化失败，使用localStorage:', error.message);
            return false;
        }
    }

    // 提交学生数据
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
            console.log('学生数据提交到Firebase成功:', dataToSave);
            return newStudentRef.key;
        } catch (error) {
            console.error('提交学生数据到Firebase失败:', error);
            throw error;
        }
    }

    // 获取所有学生数据（一次性）
    async getAllStudents() {
        if (!this.initialized) {
            throw new Error('Firebase not initialized');
        }
        
        try {
            const snapshot = await this.database.ref('students').once('value');
            const data = snapshot.val();
            
            if (!data) return [];
            
            // 转换为数组格式
            const students = Object.keys(data).map(key => ({
                ...data[key],
                firebaseId: key
            }));
            
            console.log('从Firebase获取学生数据:', students.length, '条记录');
            return students;
        } catch (error) {
            console.error('从Firebase获取学生数据失败:', error);
            throw error;
        }
    }

    // 实时监听学生数据变化
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
            
            console.log('Firebase实时数据更新:', students.length, '条记录');
            callback(students);
        });
        
        // 存储监听器引用
        const listenerId = 'students_' + Date.now();
        this.listeners.set(listenerId, { ref: studentsRef, listener });
        
        return listenerId;
    }

    // 移除监听器
    removeListener(listenerId) {
        const listenerInfo = this.listeners.get(listenerId);
        if (listenerInfo) {
            listenerInfo.ref.off('value', listenerInfo.listener);
            this.listeners.delete(listenerId);
            console.log('移除Firebase监听器:', listenerId);
        }
    }

    // 清理所有监听器
    cleanup() {
        this.listeners.forEach((listenerInfo, listenerId) => {
            this.removeListener(listenerId);
        });
        console.log('Firebase服务已清理');
    }

    // 获取连接状态
    onConnectionChange(callback) {
        if (!this.initialized) return;
        
        const connectedRef = this.database.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            const connected = snapshot.val() === true;
            console.log('Firebase连接状态:', connected ? '已连接' : '已断开');
            callback(connected);
        });
    }
}

// 创建全局Firebase服务实例
window.firebaseService = new FirebaseService();

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
    if (window.firebaseService) {
        window.firebaseService.cleanup();
    }
});