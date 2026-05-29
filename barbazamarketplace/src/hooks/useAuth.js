import { useState, useEffect, useContext, createContext } from 'react';
import { loginUser, registerUser, logoutUser, getCurrentUser } from '../api/EcommerceApi';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                try {
                    const userData = await getCurrentUser();
                    if (userData) {
                        setUser(userData);
                    } else {
                        localStorage.removeItem('auth_token');
                        setUser(null);
                    }
                } catch (err) {
                    console.error('Failed to get user:', err);
                    localStorage.removeItem('auth_token');
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = async (credentials) => {
        try {
            setError(null);
            const data = await loginUser(credentials);
            setUser(data.user || data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const register = async (userData) => {
        try {
            setError(null);
            const data = await registerUser(userData);
            setUser(data.user || data);
            return data;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            setError(null);
        }
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        error,
        isAuthenticated: !!user,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
