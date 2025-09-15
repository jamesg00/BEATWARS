import React, { useState } from 'react';
import myImage from './Logo.png';
import fireVideo from './Fire_30___45s___4k_res.mp4';

export const Register = (props) => {

    const [email, setEmail] = useState('');
    const [password, setPass] = useState('');
    const [name, setName] = useState('');
    const [errors, setErrors] = useState({ name: "", email: "", password: "" });

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        return password.length >= 8;
    };

    const validateName = (name) => {
        return name.trim().length > 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const nameError = validateName(name) ? "" : "Name is required";
        const emailError = validateEmail(email) ? "" : "Invalid email format";
        const passwordError = validatePassword(password) ? "" : "Password must be at least 8 characters long";
        setErrors({ name: nameError, email: emailError, password: passwordError });

        if (!nameError && !emailError && !passwordError) {
            console.log("Registration submitted");
        }

        console.log(email, password, name);
    };

    return (
        <div className ="RegisterWrap">

            <video
                className="bg-video"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                aria-hidden="true"
                >
                <source src={fireVideo} type="video/mp4" />
                </video>

        
            <div className="auth-form-container">
                <img src={myImage} className="Logo" alt="Logo" style={{ width: '250px', height: '100px' }} />
                <h2>Register</h2>
                <form className="register-form" onSubmit={handleSubmit}>
                    <label htmlFor="name">Full Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} name="name" id="name" placeholder="Full Name" />
                    {errors.name && <p style={{ color: 'red' }}>{errors.name}</p>}
                    <label htmlFor="email">Email:</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="youremail@email.com" id="email" name="email" />
                    {errors.email && <p style={{ color: 'red' }}>{errors.email}</p>}
                    <label htmlFor="password">Password:</label>
                    <input value={password} onChange={(e) => setPass(e.target.value)} type="password" placeholder="********" id="password" name="password" />
                    {errors.password && <p style={{ color: 'red' }}>{errors.password}</p>}
                    <button type="submit">Register</button>
                </form>
                <button className="link-btn" onClick={() => props.onFormSwitch('login')}>Already have an account? Login Here</button>
            </div>
        </div>
    )

}