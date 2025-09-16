import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
from tqdm import tqdm

# --- CONFIGURATION ---
NUM_USERS = 500
NUM_TOPICS = 100
NUM_EVENTS = 100000  # Total number of simulated review events
OUTPUT_FILE = 'synthetic_learning_data.csv'

def generate_synthetic_data():
    """
    Generates a synthetic dataset simulating users learning topics over time,
    based on the Ebbinghaus forgetting curve.
    """
    print("Starting synthetic data generation...")

    # --- 1. Simulate Users and Topics ---
    users = pd.DataFrame({
        'user_id': range(NUM_USERS),
        # Each user has a different base memory strength (higher is better)
        'memory_strength': np.random.uniform(0.5, 2.0, NUM_USERS)
    })

    topics = pd.DataFrame({
        'topic_id': range(NUM_TOPICS),
        # Each topic has a different intrinsic difficulty (higher is harder)
        'base_difficulty': np.random.uniform(0.5, 1.5, NUM_TOPICS)
    })

    # --- 2. Initialize Learning State ---
    # This tracks the current state of each user with each topic
    learning_state = {} # Key: (user_id, topic_id), Value: dict of srs_data

    # --- 3. Main Simulation Loop ---
    history = []
    for _ in tqdm(range(NUM_EVENTS), desc="Simulating Learning Events"):
        user_id = random.randint(0, NUM_USERS - 1)
        topic_id = random.randint(0, NUM_TOPICS - 1)

        state_key = (user_id, topic_id)

        # Get current state or initialize a new one
        state = learning_state.get(state_key, {
            'repetitions': 0,
            'ease_factor': 2.5,
            'last_review': datetime.now() - timedelta(days=random.randint(1, 30))
        })
        
        # --- 4. Forgetting Curve Logic ---
        user = users.iloc[user_id]
        topic = topics.iloc[topic_id]

        days_since_last_review = (datetime.now() - state['last_review']).days
        
        # Memory strength 'S' is influenced by repetitions, ease, user skill, and topic difficulty
        strength_S = (state['repetitions'] + 1) * state['ease_factor'] * user['memory_strength'] / topic['base_difficulty']
        
        # Probability of recall = e^(-t/S)
        # where t = time elapsed, S = memory strength
        prob_recall = np.exp(-days_since_last_review / max(0.1, strength_S))

        # Did the user recall correctly?
        recalled_correctly = 1 if random.random() < prob_recall else 0

        # --- 5. Log the Event ---
        history.append({
            'user_id': user_id,
            'topic_id': topic_id,
            'days_since_last_review': days_since_last_review,
            'repetitions': state['repetitions'],
            'ease_factor': state['ease_factor'],
            'recalled_correctly': recalled_correctly # This is our TARGET LABEL
        })

        # --- 6. Update the State for the Next Event ---
        if recalled_correctly:
            state['repetitions'] += 1
            state['ease_factor'] = max(1.3, state['ease_factor'] + 0.1)
        else:
            state['repetitions'] = 0
            state['ease_factor'] = max(1.3, state['ease_factor'] - 0.2)
        
        state['last_review'] = datetime.now()
        learning_state[state_key] = state

    # --- 7. Save to CSV ---
    df = pd.DataFrame(history)
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"\nSuccessfully generated {len(df)} records.")
    print(f"Data saved to '{OUTPUT_FILE}'")
    print("Sample of the data:")
    print(df.head())

if __name__ == '__main__':
    generate_synthetic_data()