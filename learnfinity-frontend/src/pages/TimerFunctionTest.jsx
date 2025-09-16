// src/pages/TimerFunctionTest.jsx
import React from 'react';
import { startSession } from '../utils/studySessionService';
import { useAuth } from '../context/AuthContext';

const TimerFunctionTest = () => {
    const { user } = useAuth();

    const runTest = async () => {
        if (!user) {
            console.error("TIMER TEST FAILED: User object is not available.");
            alert("TIMER TEST FAILED: User object is not available.");
            return;
        }

        console.log(`TIMER TEST INFO: Attempting to start session for user ${user.id}...`);
        
        // IMPORTANT: We use hardcoded data to isolate the Supabase function.
        // Make sure you have a topic with an ID of 1 in your 'user_topics' table.
        const FAKE_TOPIC_ID = 1;
        const FAKE_PLANNED_DURATION = 15;

        const newSession = await startSession(user.id, FAKE_TOPIC_ID, FAKE_PLANNED_DURATION);

        if (newSession) {
            console.log("✅ TIMER TEST SUCCESS: Supabase returned a new session object:", newSession);
            alert("SUCCESS! A new session was created in Supabase. Check the console and your database table.");
        } else {
            console.error("TIMER TEST FAILED: The 'startSession' function failed. Check the console for a detailed Supabase error message above this line.");
            alert("FAILURE! The session was not created. Check the browser console for a detailed Supabase error.");
        }
    };

    return (
        <div style={{ padding: '40px', color: 'white', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <h1>Timer Function Test</h1>
            <p>This button will try to create a new entry in your `study_sessions` table.</p>
            <p><strong>Before you click:</strong> Please ensure a topic with `id = 1` exists in your `user_topics` table.</p>
            <button onClick={runTest} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}>
                Run Timer Function Test
            </button>
            <p>Check the browser's developer console (F12) for results after clicking.</p>
        </div>
    );
};

export default TimerFunctionTest;