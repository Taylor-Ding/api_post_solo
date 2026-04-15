use serde_json::Value;
use sqlx::{mysql::MySqlPool, Row};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

// 计算 custNo 的 Hash 值
pub fn calculate_hash(cust_no: &str) -> u64 {
    let mut hasher = DefaultHasher::new();
    cust_no.hash(&mut hasher);
    hasher.finish()
}

// 根据 Hash 值计算库表索引
pub fn get_db_table_index(hash_value: u64) -> (u32, u32) {
    let hash_result = (hash_value % 8 + 1) as u32; // 1-8
    let db_index = (hash_result - 1) / 2 + 1; // 1-4
    (db_index, hash_result)
}

// 构建数据库连接字符串
pub fn build_db_url(db_index: u32) -> String {
    format!("mysql://user:password@localhost:3306/dcdpdb{}", db_index)
}

// 构建表名
pub fn build_table_name(table_suffix: u32) -> String {
    format!("tb_dpmst_medium_{:04}", table_suffix)
}

// 查询数据库
pub async fn query_database(cust_no: &str) -> Result<Value, Box<dyn std::error::Error>> {
    let hash_value = calculate_hash(cust_no);
    let (db_index, table_suffix) = get_db_table_index(hash_value);
    let db_url = build_db_url(db_index);
    let table_name = build_table_name(table_suffix);
    
    println!("Routing to database: dcdpdb{}, table: {}", db_index, table_name);
    
    let pool = MySqlPool::connect(&db_url).await?;
    let query = format!("SELECT * FROM {} WHERE cust_no = ?", table_name);
    
    let rows = sqlx::query(&query)
        .bind(cust_no)
        .fetch_all(&pool)
        .await?;
    
    let mut results = Vec::new();
    for row in rows {
        let mut record = serde_json::Map::new();
        for (i, column) in row.columns().iter().enumerate() {
            let column_name = column.name();
            let value = match row.try_get_raw(i) {
                Ok(raw_value) => {
                    if raw_value.is_null() {
                        Value::Null
                    } else if let Ok(v) = raw_value.try_decode::<String>() {
                        Value::String(v)
                    } else if let Ok(v) = raw_value.try_decode::<i32>() {
                        Value::Number(serde_json::Number::from(v))
                    } else if let Ok(v) = raw_value.try_decode::<i64>() {
                        Value::Number(serde_json::Number::from(v))
                    } else if let Ok(v) = raw_value.try_decode::<f32>() {
                        Value::Number(serde_json::Number::from_f64(v as f64).unwrap())
                    } else if let Ok(v) = raw_value.try_decode::<f64>() {
                        Value::Number(serde_json::Number::from_f64(v).unwrap())
                    } else if let Ok(v) = raw_value.try_decode::<bool>() {
                        Value::Bool(v)
                    } else {
                        Value::String(format!("{:?}", raw_value))
                    }
                }
                Err(_) => Value::Null
            };
            record.insert(column_name.to_string(), value);
        }
        results.push(Value::Object(record));
    }
    
    Ok(Value::Array(results))
}
