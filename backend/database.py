from pymongo import MongoClient, GEOSPHERE  # type: ignore
from datetime import datetime
import os
try:
    from dotenv import load_dotenv  # type: ignore
    load_dotenv()
except Exception:
    pass
from models import (
    Lake, SatelliteImage, WaterQuantityPrediction, WaterQualityPrediction,
    WaterQuantityObservation, User, UserSession, ModelMetadata, ModelPredictionHistory,
    WaterQualityParameters, QualityTrends, SpectralProfiles, QualityScores,
    SystemConfig, TrainingData, LabelEncoder
)


# --------------------------
# Database Setup
# --------------------------
def get_client(uri: str = None):
    uri = uri or os.getenv("MONGODB_URI")
    return MongoClient(uri)


def get_db(client, db_name: str = None):
    db_name = db_name or os.getenv("MONGODB_DB_NAME")
    return client[db_name]


def init_collections(db):
    # Lakes
    lakes = db["lakes"]
    lakes.create_index([("lake_id", 1)], unique=True)
    lakes.create_index([("location", GEOSPHERE)])

    # Satellite images
    satellite_images = db["satellite_images"]
    satellite_images.create_index(
        [("lake_id", 1), ("date", 1), ("source", 1)], unique=True
    )

    # Predictions
    predictions = db["predictions"]
    predictions.create_index(
        [("lake_id", 1), ("date", 1), ("prediction_type", 1), ("model_version", 1)],
        unique=True,
    )

    # Observations (real values)
    observations = db["water_quantity_observations"]
    observations.create_index([("lake_id", 1), ("date", 1)], unique=True)

    # Users
    users = db["users"]
    users.create_index([("username", 1)], unique=True)
    users.create_index([("email", 1)], unique=True, sparse=True)

    # User sessions
    user_sessions = db["user_sessions"]
    user_sessions.create_index([("token", 1)], unique=True)
    user_sessions.create_index([("user_id", 1), ("expires_at", 1)])

    # Model metadata
    model_metadata = db["model_metadata"]
    model_metadata.create_index([("model_id", 1)], unique=True)
    model_metadata.create_index([("status", 1)])

    # Model prediction history
    model_prediction_history = db["model_prediction_history"]
    model_prediction_history.create_index([("lake_id", 1), ("date", 1), ("model_id", 1), ("horizon", 1)])

    # Water quality parameters
    water_quality_parameters = db["water_quality_parameters"]
    water_quality_parameters.create_index([("lake_id", 1)], unique=True)

    # Quality trends
    quality_trends = db["quality_trends"]
    quality_trends.create_index([("parameter", 1)], unique=True)

    # Spectral profiles
    spectral_profiles = db["spectral_profiles"]
    spectral_profiles.create_index([("lake_id", 1)], unique=True)

    # Quality scores
    quality_scores = db["quality_scores"]
    quality_scores.create_index([("lake_id", 1)], unique=True)

    # System config
    system_config = db["system_config"]
    system_config.create_index([("config_type", 1)], unique=True)

    # Training data
    training_data = db["training_data"]
    training_data.create_index([("lake_id", 1), ("date", 1), ("horizon", 1), ("split_type", 1)])

    # Label encoders
    label_encoders = db["label_encoders"]
    label_encoders.create_index([("encoder_name", 1)], unique=True)

    return {
        "lakes": lakes,
        "satellite_images": satellite_images,
        "predictions": predictions,
        "observations": observations,
        "users": users,
        "user_sessions": user_sessions,
        "model_metadata": model_metadata,
        "model_prediction_history": model_prediction_history,
        "water_quality_parameters": water_quality_parameters,
        "quality_trends": quality_trends,
        "spectral_profiles": spectral_profiles,
        "quality_scores": quality_scores,
        "system_config": system_config,
        "training_data": training_data,
        "label_encoders": label_encoders,
    }


# --------------------------
# Insert Functions
# --------------------------
def insert_lake(db, lake: Lake):
    doc = lake.dict()
    doc["created_at"] = datetime.utcnow()
    db["lakes"].update_one({"lake_id": lake.lake_id}, {"$set": doc}, upsert=True)
    return doc


def insert_satellite_image(db, image: SatelliteImage):
    doc = image.dict()
    doc["created_at"] = datetime.utcnow()
    db["satellite_images"].update_one(
        {"lake_id": image.lake_id, "date": image.date, "source": image.source},
        {"$set": doc},
        upsert=True,
    )
    return doc


def insert_prediction(db, prediction):
    doc = prediction.dict()
    doc["created_at"] = datetime.utcnow()
    db["predictions"].update_one(
        {
            "lake_id": prediction.lake_id,
            "date": prediction.date,
            "prediction_type": prediction.prediction_type,
            "model_version": prediction.model_version,
        },
        {"$set": doc},
        upsert=True,
    )
    return doc


def insert_water_quantity_observation(db, obs):
    doc = obs.dict()
    doc["created_at"] = datetime.utcnow()
    db["water_quantity_observations"].update_one(
        {"lake_id": obs.lake_id, "date": obs.date}, {"$set": doc}, upsert=True
    )
    return doc


# New insert functions for additional collections
def insert_user(db, user: User):
    doc = user.dict()
    doc["created_at"] = datetime.utcnow()
    db["users"].update_one({"username": user.username}, {"$set": doc}, upsert=True)
    return doc


def insert_user_session(db, session: UserSession):
    doc = session.dict()
    doc["created_at"] = datetime.utcnow()
    db["user_sessions"].update_one({"token": session.token}, {"$set": doc}, upsert=True)
    return doc


def insert_model_metadata(db, model: ModelMetadata):
    doc = model.dict()
    doc["created_at"] = datetime.utcnow()
    db["model_metadata"].update_one({"model_id": model.model_id}, {"$set": doc}, upsert=True)
    return doc


def insert_model_prediction_history(db, prediction: ModelPredictionHistory):
    doc = prediction.dict()
    doc["created_at"] = datetime.utcnow()
    db["model_prediction_history"].update_one(
        {
            "lake_id": prediction.lake_id,
            "date": prediction.date,
            "model_id": prediction.model_id,
            "horizon": prediction.horizon
        },
        {"$set": doc},
        upsert=True
    )
    return doc


def insert_water_quality_parameters(db, params: WaterQualityParameters):
    doc = params.dict()
    doc["updated_at"] = datetime.utcnow()
    db["water_quality_parameters"].update_one(
        {"lake_id": params.lake_id}, {"$set": doc}, upsert=True
    )
    return doc


def insert_quality_trends(db, trend: QualityTrends):
    doc = trend.dict()
    doc["updated_at"] = datetime.utcnow()
    db["quality_trends"].update_one(
        {"parameter": trend.parameter}, {"$set": doc}, upsert=True
    )
    return doc


def insert_spectral_profiles(db, profile: SpectralProfiles):
    doc = profile.dict()
    doc["updated_at"] = datetime.utcnow()
    db["spectral_profiles"].update_one(
        {"lake_id": profile.lake_id}, {"$set": doc}, upsert=True
    )
    return doc


def insert_quality_scores(db, score: QualityScores):
    doc = score.dict()
    doc["updated_at"] = datetime.utcnow()
    db["quality_scores"].update_one(
        {"lake_id": score.lake_id}, {"$set": doc}, upsert=True
    )
    return doc


def insert_system_config(db, config: SystemConfig):
    doc = config.dict()
    doc["updated_at"] = datetime.utcnow()
    db["system_config"].update_one(
        {"config_type": config.config_type}, {"$set": doc}, upsert=True
    )
    return doc


def insert_training_data(db, training_data: TrainingData):
    doc = training_data.dict()
    doc["created_at"] = datetime.utcnow()
    db["training_data"].update_one(
        {
            "lake_id": training_data.lake_id,
            "date": training_data.date,
            "horizon": training_data.horizon,
            "split_type": training_data.split_type
        },
        {"$set": doc},
        upsert=True
    )
    return doc


def insert_label_encoder(db, encoder: LabelEncoder):
    doc = encoder.dict()
    doc["created_at"] = datetime.utcnow()
    db["label_encoders"].update_one(
        {"encoder_name": encoder.encoder_name}, {"$set": doc}, upsert=True
    )
    return doc


# Batch insert functions for efficiency
def insert_training_data_batch(db, training_data_list):
    """Insert multiple training data records efficiently"""
    docs = []
    for training_data in training_data_list:
        doc = training_data.dict()
        doc["created_at"] = datetime.utcnow()
        docs.append(doc)
    
    if docs:
        db["training_data"].insert_many(docs, ordered=False)
    return len(docs)


def insert_model_prediction_history_batch(db, predictions_list):
    """Insert multiple prediction history records efficiently"""
    docs = []
    for prediction in predictions_list:
        doc = prediction.dict()
        doc["created_at"] = datetime.utcnow()
        docs.append(doc)
    
    if docs:
        db["model_prediction_history"].insert_many(docs, ordered=False)
    return len(docs)
