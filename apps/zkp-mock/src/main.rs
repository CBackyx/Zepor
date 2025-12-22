use axum::{
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::time::Duration;
use tokio::time::sleep;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/generate", post(generate_proof))
        .route("/verify", post(verify_proof));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[derive(Deserialize)]
struct ProofRequest {
    proof_id: u32,
    pdf_hash: String,
}

#[derive(Serialize)]
struct ProofResponse {
    proof_id: u32,
    pdf_hash: String,
    zk_proof: String,
    status: String,
}

async fn generate_proof(Json(payload): Json<ProofRequest>) -> Json<ProofResponse> {
    println!("Received proof request for ID: {}", payload.proof_id);
    
    // Simulate delay
    sleep(Duration::from_secs(2)).await;

    Json(ProofResponse {
        proof_id: payload.proof_id,
        pdf_hash: payload.pdf_hash,
        zk_proof: "mock_zk_proof_data_xyz123".to_string(),
        status: "VERIFIED".to_string(),
    })
}

async fn verify_proof() -> Json<serde_json::Value> {
    Json(serde_json::json!({ "valid": true }))
}
