import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import microdiff from "microdiff";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import "./App.css";

function App() {
  // 状态管理
  const [apiUrl, setApiUrl] = useState("");
  const [payload, setPayload] = useState("{}");
  const [tableNames, setTableNames] = useState("");
  const [preData, setPreData] = useState({});
  const [postData, setPostData] = useState({});
  const [diffResult, setDiffResult] = useState({});
  const [apiResponse, setApiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flowControlLogs, setFlowControlLogs] = useState([]);
  const [showFlowLogs, setShowFlowLogs] = useState(false);
  const [activeTab, setActiveTab] = useState("response");
  const [store, setStore] = useState(null);
  
  // 日志容器引用
  const logContainerRef = useRef(null);
  
  // 硬编码的忽略字段
  const ignoreFields = "update_time,version,trace_id";

  // 初始化存储
  useEffect(() => {
    const initStore = async () => {
      const newStore = new Store("config.json");
      await newStore.load();
      
      // 加载保存的配置
      const savedApiUrl = await newStore.get("apiUrl");
      const savedTableNames = await newStore.get("tableNames");
      
      if (savedApiUrl) setApiUrl(savedApiUrl);
      if (savedTableNames) setTableNames(savedTableNames);
      
      setStore(newStore);
    };
    
    initStore();
  }, []);

  // 保存配置
  const saveConfig = async () => {
    if (store) {
      await store.set("apiUrl", apiUrl);
      await store.set("tableNames", tableNames);
      await store.save();
    }
  };

  // 监听配置变化
  useEffect(() => {
    saveConfig();
  }, [apiUrl, tableNames]);

  // 监听日志变化，自动滚动到底部
  useEffect(() => {
    if (logContainerRef.current && showFlowLogs) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [flowControlLogs, showFlowLogs]);

  // 添加日志
  const addLog = (message) => {
    const time = new Date().toLocaleTimeString();
    setFlowControlLogs(prev => {
      if (prev.length > 100) {
        return [...prev.slice(1), `[${time}] ${message}`];
      }
      return [...prev, `[${time}] ${message}`];
    });
  };

  // 从报文中获取 custNo
  const extractCustNo = (payloadObj) => {
    if (payloadObj.custNo) return payloadObj.custNo;
    if (payloadObj.cust_no) return payloadObj.cust_no;
    if (payloadObj.CustNo) return payloadObj.CustNo;
    return "";
  };

  // 处理测试流程
  const handleTest = async () => {
    setIsLoading(true);
    setFlowControlLogs([]);
    setPreData({});
    setPostData({});
    setDiffResult({});
    setApiResponse(null);
    // 自动显示日志框
    setShowFlowLogs(true);
    
    try {
      const payloadObj = JSON.parse(payload);
      const custNo = extractCustNo(payloadObj);
      const tables = tableNames.split(',').map(table => table.trim()).filter(table => table !== '');
      
      addLog(`开始测试流程，custNo: ${custNo}`);
      addLog(`目标表: ${tables.join(', ')}`);
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 1. 查询接口触发前的数据（模拟）
      addLog("查询接口触发前的数据...");
      const preDataResult = {};
      for (const table of tables) {
        // 模拟数据
        preDataResult[table] = [
          {
            "id": 1,
            "cust_no": custNo,
            "name": "测试用户",
            "status": "active",
            "balance": 1000,
            "update_time": "2026-04-15 10:00:00",
            "version": 1
          }
        ];
        addLog(`查询表 ${table} 完成`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setPreData(preDataResult);
      addLog("接口触发前数据查询完成");
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // 2. 发送 API 请求（模拟）
      addLog(`发送 API 请求到: ${apiUrl}`);
      // 模拟返回报文
      const response = {
        "code": 200,
        "message": "success",
        "data": {
          "order_id": "ORD20260415001",
          "amount": 100,
          "status": "completed"
        }
      };
      setApiResponse(response);
      addLog("API 请求发送成功，获取返回报文");
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. 查询接口触发后的数据（模拟）
      addLog("查询接口触发后的数据...");
      const postDataResult = {};
      for (const table of tables) {
        // 模拟数据（与之前有差异）
        postDataResult[table] = [
          {
            "id": 1,
            "cust_no": custNo,
            "name": "测试用户",
            "status": "inactive",
            "balance": 900,
            "update_time": "2026-04-15 10:01:00",
            "version": 2
          }
        ];
        addLog(`查询表 ${table} 完成`);
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setPostData(postDataResult);
      addLog("接口触发后数据查询完成");
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 4. 计算差异
      addLog("开始计算数据差异...");
      const ignoreList = ignoreFields.split(',').map(field => field.trim());
      const diffResultObj = {};
      for (const table of tables) {
        const filteredPreData = filterFields(preDataResult[table], ignoreList);
        const filteredPostData = filterFields(postDataResult[table], ignoreList);
        const result = microdiff(filteredPreData, filteredPostData, { ignoreOrder: true });
        diffResultObj[table] = result;
      }
      setDiffResult(diffResultObj);
      addLog("差异计算完成");
    } catch (error) {
      console.error('Test failed:', error);
      addLog(`[ERROR] ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 组件挂载时自动填充测试数据
  useEffect(() => {
    setApiUrl("https://api.example.com/test");
    setPayload(JSON.stringify({
      "custNo": "C123456",
      "amount": 100,
      "type": "test"
    }, null, 2));
    setTableNames("tb_dpmst_medium_0001, tb_dpmst_medium_0002");
  }, []);

  // 过滤不需要比对的字段
  const filterFields = (data, ignoreList) => {
    if (Array.isArray(data)) {
      return data.map(item => filterFields(item, ignoreList));
    } else if (typeof data === 'object' && data !== null) {
      const filtered = {};
      for (const [key, value] of Object.entries(data)) {
        if (!ignoreList.includes(key)) {
          filtered[key] = filterFields(value, ignoreList);
        }
      }
      return filtered;
    }
    return data;
  };

  // 渲染差异结果
  const renderDiff = (diffItems) => {
    if (Object.keys(diffItems).length === 0) {
      return (
        <motion.div 
          className="diff-result success"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>✅ 数据一致，无差异</h3>
        </motion.div>
      );
    }

    return (
      <motion.div 
        className="diff-result"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3>🔍 差异结果</h3>
        {Object.entries(diffItems).map(([table, items]) => (
          <div key={table} className="table-diff">
            <h4>表: {table}</h4>
            {items.length === 0 ? (
              <p className="no-diff">无差异</p>
            ) : (
              items.map((item, index) => (
                <div key={index} className={`diff-item ${item.type}`}>
                  <div className="diff-path">{item.path.join('.')}</div>
                  {item.type === 'remove' && (
                    <div className="diff-value old">- {JSON.stringify(item.oldValue)}</div>
                  )}
                  {item.type === 'add' && (
                    <div className="diff-value new">+ {JSON.stringify(item.newValue)}</div>
                  )}
                  {item.type === 'change' && (
                    <>
                      <div className="diff-value old">- {JSON.stringify(item.oldValue)}</div>
                      <div className="diff-value new">+ {JSON.stringify(item.newValue)}</div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </motion.div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="app-title"
        >
          数据一致性自动化核对工具
        </motion.h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="log-toggle"
          onClick={() => setShowFlowLogs(!showFlowLogs)}
        >
          {showFlowLogs ? '隐藏实时流控日志' : '显示实时流控日志'}
        </motion.button>
      </header>

      <div className="main-container">
        {/* 左侧：输入配置 */}
        <motion.div 
          className="left-panel"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="panel-card">
            <h2>测试配置</h2>
            <div className="form-group">
              <label>API 地址:</label>
              <input 
                type="text" 
                value={apiUrl} 
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="请输入 API 地址"
              />
            </div>
            <div className="form-group">
              <label>测试报文:</label>
              <textarea 
                value={payload} 
                onChange={(e) => setPayload(e.target.value)}
                placeholder="请输入 JSON 格式的测试报文"
                rows={6}
              />
            </div>
            <div className="form-group">
              <label>需要断言的表名:</label>
              <input 
                type="text" 
                value={tableNames} 
                onChange={(e) => setTableNames(e.target.value)}
                placeholder="请输入需要断言的表名，多个表用逗号分隔"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="test-button"
              onClick={handleTest}
              disabled={isLoading || !apiUrl || !payload || !tableNames}
            >
              {isLoading ? '测试中...' : '开始测试'}
            </motion.button>
          </div>
        </motion.div>

        {/* 右侧：结果展示 */}
        <motion.div 
          className="right-panel"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AnimatePresence>
            {isLoading && !apiResponse && (
              <motion.div 
                key="loading"
                className="panel-card loading-panel"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="loading-content">
                  <div className="spinner">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="spinner-inner"
                    />
                  </div>
                  <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    测试执行中...
                  </motion.h3>
                  <motion.div
                    className="loading-steps"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="loading-step">
                      <span className="step-icon">🔍</span>
                      <span className="step-text">查询前置数据</span>
                    </div>
                    <div className="loading-step">
                      <span className="step-icon">📡</span>
                      <span className="step-text">发送 API 请求</span>
                    </div>
                    <div className="loading-step">
                      <span className="step-icon">📊</span>
                      <span className="step-text">查询后置数据</span>
                    </div>
                    <div className="loading-step">
                      <span className="step-icon">🔄</span>
                      <span className="step-text">比对数据差异</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
            
            {apiResponse && (
              <motion.div 
                key="results"
                className="panel-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="tab-container">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`tab-button ${activeTab === "response" ? "active" : ""}`}
                    onClick={() => setActiveTab("response")}
                  >
                    返回报文
                  </motion.button>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`tab-button ${activeTab === "sql" ? "active" : ""}`}
                    onClick={() => setActiveTab("sql")}
                  >
                    SQL 比对
                  </motion.button>
                </div>
                
                {activeTab === "response" && (
                  <motion.div 
                    className="response-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3>接口返回报文</h3>
                    <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                  </motion.div>
                )}
                
                {activeTab === "sql" && (
                  <motion.div 
                    className="sql-panel"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3>SQL 比对结果</h3>
                    {Object.entries(preData).map(([table, data]) => (
                      <motion.div 
                        key={table} 
                        className="table-comparison"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <h4>表: {table}</h4>
                        <div className="data-comparison">
                          <motion.div 
                            className="data-panel"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          >
                            <h5>接口触发前</h5>
                            <pre>{JSON.stringify(data, null, 2)}</pre>
                          </motion.div>
                          <motion.div 
                            className="data-panel"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: 0.3 }}
                          >
                            <h5>接口触发后</h5>
                            <pre>{JSON.stringify(postData[table], null, 2)}</pre>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                    {renderDiff(diffResult)}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <AnimatePresence>
        {showFlowLogs && (
          <motion.div 
            className="log-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '250px', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="log-header">
              <h3>实时流控日志</h3>
            </div>
            <div className="log-content" ref={logContainerRef}>
              {flowControlLogs.map((log, index) => (
                <motion.div 
                  key={index} 
                  className="log-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {log}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
