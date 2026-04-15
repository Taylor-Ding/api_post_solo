import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { diff } from "microdiff";
import { invoke } from "@tauri-apps/api/core";
import { Store } from "@tauri-apps/plugin-store";
import "./App.css";

function App() {
  // 状态管理
  const [custNo, setCustNo] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [payload, setPayload] = useState("{}");
  const [preData, setPreData] = useState(null);
  const [postData, setPostData] = useState(null);
  const [diffResult, setDiffResult] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [ignoreFields, setIgnoreFields] = useState("update_time,version,trace_id");
  const [store, setStore] = useState(null);

  // 初始化存储
  useEffect(() => {
    const initStore = async () => {
      const newStore = new Store("config.json");
      await newStore.load();
      
      // 加载保存的配置
      const savedApiUrl = await newStore.get("apiUrl");
      const savedIgnoreFields = await newStore.get("ignoreFields");
      
      if (savedApiUrl) setApiUrl(savedApiUrl);
      if (savedIgnoreFields) setIgnoreFields(savedIgnoreFields);
      
      setStore(newStore);
    };
    
    initStore();
  }, []);

  // 保存配置
  const saveConfig = async () => {
    if (store) {
      await store.set("apiUrl", apiUrl);
      await store.set("ignoreFields", ignoreFields);
      await store.save();
    }
  };

  // 监听配置变化
  useEffect(() => {
    saveConfig();
  }, [apiUrl, ignoreFields]);

  // 模拟日志收集
  useEffect(() => {
    const interval = setInterval(() => {
      // 实际项目中，这里应该通过 tauri-plugin-log 监听日志
      setLogs(prev => {
        if (prev.length > 50) {
          return [...prev.slice(1), `[${new Date().toLocaleTimeString()}] Log message`];
        }
        return [...prev, `[${new Date().toLocaleTimeString()}] Log message`];
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // 处理测试流程
  const handleTest = async () => {
    setIsLoading(true);
    try {
      // 1. 查询接口触发前的数据
      const preResult = await invoke("query_pre_data", { custNo });
      setPreData(preResult);
      
      // 2. 发送 API 请求
      const payloadObj = JSON.parse(payload);
      await invoke("send_api_request", { url: apiUrl, payload: payloadObj });
      
      // 3. 查询接口触发后的数据
      const postResult = await invoke("query_post_data", { custNo });
      setPostData(postResult);
      
      // 4. 计算差异
      const ignoreList = ignoreFields.split(',').map(field => field.trim());
      const filteredPreData = filterFields(preResult, ignoreList);
      const filteredPostData = filterFields(postResult, ignoreList);
      
      const result = diff(filteredPreData, filteredPostData, { ignoreOrder: true });
      setDiffResult(result);
    } catch (error) {
      console.error('Test failed:', error);
      setLogs(prev => [...prev, `[ERROR] ${error.message}`]);
    } finally {
      setIsLoading(false);
    }
  };

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
    if (diffItems.length === 0) {
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
        {diffItems.map((item, index) => (
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
          onClick={() => setShowLogs(!showLogs)}
        >
          {showLogs ? '隐藏日志' : '显示日志'}
        </motion.button>
      </header>

      <main className="app-main">
        <motion.div 
          className="input-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2>测试配置</h2>
          <div className="form-group">
            <label>用户标识 (custNo):</label>
            <input 
              type="text" 
              value={custNo} 
              onChange={(e) => setCustNo(e.target.value)}
              placeholder="请输入用户标识"
            />
          </div>
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
            <label>忽略字段:</label>
            <input 
              type="text" 
              value={ignoreFields} 
              onChange={(e) => setIgnoreFields(e.target.value)}
              placeholder="请输入需要忽略的字段，用逗号分隔"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="test-button"
            onClick={handleTest}
            disabled={isLoading || !custNo || !apiUrl || !payload}
          >
            {isLoading ? '测试中...' : '开始测试'}
          </motion.button>
        </motion.div>

        <AnimatePresence>
          {(preData || postData) && (
            <motion.div 
              className="result-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h2>测试结果</h2>
              <div className="data-comparison">
                <div className="data-panel">
                  <h3>接口触发前</h3>
                  <pre>{JSON.stringify(preData, null, 2)}</pre>
                </div>
                <div className="data-panel">
                  <h3>接口触发后</h3>
                  <pre>{JSON.stringify(postData, null, 2)}</pre>
                </div>
              </div>
              {renderDiff(diffResult)}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showLogs && (
          <motion.div 
            className="log-drawer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: '300px', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="log-header">
              <h3>执行日志</h3>
            </div>
            <div className="log-content">
              {logs.map((log, index) => (
                <div key={index} className="log-item">{log}</div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
