import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle

# --- CONFIGURATION ---
DATA_FILE = 'synthetic_learning_data.csv'
MODEL_OUTPUT_FILE = 'srs_model.pkl'

def train_model():
    """
    Loads the synthetic data, trains an XGBoost classifier, evaluates its performance,
    and saves the trained model to a file.
    """
    print("--- Starting Model Training ---")

    # 1. Load the Data
    print(f"Loading data from '{DATA_FILE}'...")
    df = pd.read_csv(DATA_FILE)

    # 2. Define Features (X) and Target (y)
    # The features are the inputs our model will learn from.
    features = [
        'days_since_last_review',
        'repetitions',
        'ease_factor'
    ]
    # The target is the output we want the model to predict.
    target = 'recalled_correctly'

    X = df[features]
    y = df[target]
    print("Features and target defined.")

    # 3. Split Data into Training and Testing Sets
    # 80% for training, 20% for testing.
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Data split into {len(X_train)} training records and {len(X_test)} testing records.")

    # 4. Initialize and Train the XGBoost Model
    print("Training the XGBoost model...")
    # These parameters are a good starting point, they can be tuned for better performance.
    model = xgb.XGBClassifier(
        objective='binary:logistic',
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42
    )
    
    model.fit(X_train, y_train)
    print("Model training complete.")

    # 5. Evaluate the Model's Performance on Unseen Data
    print("\n--- Evaluating Model Performance ---")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy on Test Data: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))

    # 6. Save the Trained Model to a File
    print(f"\nSaving the trained model to '{MODEL_OUTPUT_FILE}'...")
    with open(MODEL_OUTPUT_FILE, 'wb') as f:
        pickle.dump(model, f)
    print("Model saved successfully.")
    print("--- Training Process Finished ---")

if __name__ == '__main__':
    train_model()