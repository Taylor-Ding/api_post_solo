use serde_json::Value;

// 发送 HTTP 请求
pub async fn send_http_request(url: &str, payload: &Value) -> Result<Value, Box<dyn std::error::Error>> {
    println!("Sending request to: {}", url);
    println!("Payload: {}", payload);
    
    let client = reqwest::Client::new();
    let response = client
        .post(url)
        .json(payload)
        .send()
        .await?;
    
    let status = response.status();
    println!("Response status: {}", status);
    
    let response_body = response.text().await?;
    println!("Response body: {}", response_body);
    
    let result: Value = serde_json::from_str(&response_body)?;
    Ok(result)
}
