import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";


const socket = io(process.env.REACT_APP_SOCKET_URL || "http://localhost:5000");
function App() {
  const [warrants, setWarrants] = useState([]);
  const [filteredWarrants, setFilteredWarrants] = useState([]);
  const [watchlist, setWatchlist] = useState(() => {
    const savedWatchlist = localStorage.getItem("watchlist");
    return savedWatchlist ? JSON.parse(savedWatchlist) : [];
  });
  const [filters, setFilters] = useState({
    symbol: "",
    name: "",
    priceMin: "",
    priceMax: "",
    volumeMin: "",
    volumeMax: "",
  });
  const [selectedTable, setSelectedTable] = useState("main");
  const [filteredWatchlist, setFilteredWatchlist] = useState(watchlist);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [showFilters, setShowFilters] = useState(true); // New state for toggling filters

  const getChangeClass = (value) => {
    if (value > 0) {
      return "positive";
    } else if (value < 0) {
      return "negative";
    } else {
      return "neutral";
    }
  };

  useEffect(() => {
    socket.on("warrant_update", (data) => {
      const validatedData = Object.values(data).filter(
        (warrant) =>
          warrant.date &&
          warrant.symbol &&
          warrant.name &&
          warrant.price &&
          warrant.volume &&
          (warrant.change ?? null) !== null &&
          (warrant.percent_change ?? null) !== null &&
          (warrant.VWAP ?? null) !== null &&
          (warrant.TO ?? null) !== null
      );
      setWarrants(validatedData);
      setFilteredWarrants(validatedData);
    });

    return () => {
      socket.off("warrant_update");
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (stock) => {
    setWatchlist((prevWatchlist) => {
      if (prevWatchlist.find((item) => item.symbol === stock.symbol)) {
        return prevWatchlist.filter((item) => item.symbol !== stock.symbol);
      } else {
        return [...prevWatchlist, stock];
      }
    });
  };

  const applyFilters = () => {
    const { symbol, priceMin, priceMax, volumeMin, volumeMax } = filters;
    const tableData = selectedTable === "main" ? warrants : watchlist;

    const filtered = tableData.filter((warrant) => {
      const matchesSymbol = symbol ? warrant.symbol.toLowerCase().includes(symbol.toLowerCase()) : true;
      const matchesPrice =
        (priceMin ? warrant.price >= parseFloat(priceMin) : true) &&
        (priceMax ? warrant.price <= parseFloat(priceMax) : true);
      const matchesVolume =
        (volumeMin ? warrant.volume >= parseInt(volumeMin) : true) &&
        (volumeMax ? warrant.volume <= parseInt(volumeMax) : true);

      return matchesSymbol && matchesPrice && matchesVolume;
    });

    if (selectedTable === "main") {
      setFilteredWarrants(filtered);
    } else {
      setFilteredWatchlist(filtered);
    }
  };

  const getBiggestWinners = () => {
    const tableData = selectedTable === "main" ? warrants : watchlist;
    const sortedWinners = [...tableData].sort((a, b) => b.percent_change - a.percent_change);
    
    if (selectedTable === "main") {
      setFilteredWarrants(sortedWinners.slice(0, 10)); // Show top 10 winners
    } else {
      setFilteredWatchlist(sortedWinners.slice(0, 10));
    }
  };
  
  const getBiggestLosers = () => {
    const tableData = selectedTable === "main" ? warrants : watchlist;
    const sortedLosers = [...tableData].sort((a, b) => a.percent_change - b.percent_change);
    
    if (selectedTable === "main") {
      setFilteredWarrants(sortedLosers.slice(0, 10)); // Show top 10 losers
    } else {
      setFilteredWatchlist(sortedLosers.slice(0, 10));
    }
  };

  const clearFilters = () => {
    setFilters({
      symbol: "",
      name: "",
      priceMin: "",
      priceMax: "",
      volumeMin: "",
      volumeMax: "",
    });

    if (selectedTable === "main") {
      setFilteredWarrants(warrants);
    } else {
      setFilteredWatchlist(watchlist);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value,
    }));
  };

  const handleSort = (key) => {
    let direction = "asc";
  
    // Check if the same column is clicked again
    if (sortConfig.key === key) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        // If the same column is clicked twice with 'desc', reset sorting
        setSortConfig({ key: null, direction: null });
        const tableData = selectedTable === "main" ? filteredWarrants : filteredWatchlist;
        if (selectedTable === "main") {
          setFilteredWarrants(tableData); // Reset to unsorted data
        } else {
          setFilteredWatchlist(tableData); // Reset to unsorted data
        }
        return; // Exit the function after resetting
      }
    }
  
    // Otherwise, sort in ascending or descending order
    setSortConfig({ key, direction });
  
    const tableData = selectedTable === "main" ? filteredWarrants : filteredWatchlist;
    const sortedData = [...tableData].sort((a, b) => {
      if (a[key] < b[key]) return direction === "asc" ? -1 : 1;
      if (a[key] > b[key]) return direction === "asc" ? 1 : -1;
      return 0;
    });
  
    // Update the appropriate filtered data
    if (selectedTable === "main") {
      setFilteredWarrants(sortedData);
    } else {
      setFilteredWatchlist(sortedData);
    }
  };
  const renderTable = () => {
    const tableData = selectedTable === "main" ? filteredWarrants : filteredWatchlist;

    return (
      <table border="1">
        <thead>
          <tr>
            <th>Star</th>
            <th onClick={() => handleSort("date")}>
              Date {sortConfig.key === "date" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("symbol")}>
              Symbol {sortConfig.key === "symbol" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("name")}>
              Name {sortConfig.key === "name" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("price")}>
              Price {sortConfig.key === "price" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("volume")}>
              Volume {sortConfig.key === "volume" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("change")}>
              Change {sortConfig.key === "change" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("percent_change")}>
              % Change {sortConfig.key === "percent_change" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("VWAP")}>
              VWAP {sortConfig.key === "VWAP" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("TO")}>
              TO {sortConfig.key === "TO" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
          </tr>
        </thead>
        <tbody>
          {tableData.length > 0 ? (
            tableData.map((row, index) => (
              <tr key={index}>
                <td>
                  <span
                    style={{
                      cursor: "pointer",
                      color: watchlist.some((item) => item.symbol === row.symbol) ? "gold" : "gray",
                    }}
                    onClick={() => toggleWatchlist(row)}
                  >
                    ★
                  </span>
                </td>
                <td>{row.date}</td>
                <td>{row.symbol}</td>
                <td>{row.name}</td>
                <td>{row.price.toFixed(2)} RM</td>
                <td>{row.volume.toLocaleString()}</td>
                <td className={getChangeClass(row.change)}>{row.change}</td>
                <td className={getChangeClass(row.percent_change)}>{row.percent_change}%</td>
                <td>{row.VWAP}</td>
                <td>{row.TO}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="10">No data available</td>
            </tr>
          )}
        </tbody>
      </table>
    );
  };

  const handleTableChange = (value) => {
    setSelectedTable(value);
    setFilters({
      symbol: "",
      name: "",
      priceMin: "",
      priceMax: "",
      volumeMin: "",
      volumeMax: "",
    });

    if (value === "main") {
      setFilteredWarrants(warrants);
    } else {
      setFilteredWatchlist(watchlist);
    }
  };

  return (
    <div className="App">
      <h1 className="titlename">Live Stock Data Table</h1>

      <button class="mainbutton" onClick={() => setShowFilters((prev) => !prev)}>
        {showFilters ? "Hide Filters" : "Show Filters"}
      </button>

      {showFilters && (
        <div className="filters">
          <input
            type="text"
            name="symbol"
            placeholder="Filter by Symbol"
            value={filters.symbol}
            onChange={handleFilterChange}
          />
          <input
            type="text"
            name="name"
            placeholder="Filter by Name"
            value={filters.name}
            onChange={handleFilterChange}
          />
          <input
            type="number"
            name="volumeMin"
            placeholder="Min Volume"
            value={filters.volumeMin}
            onChange={handleFilterChange}
          />
          <input
            type="number"
            name="volumeMax"
            placeholder="Max Volume"
            value={filters.volumeMax}
            onChange={handleFilterChange}
          />
          <input
            type="number"
            name="priceMin"
            placeholder="Min Price"
            value={filters.priceMin}
            onChange={handleFilterChange}
          />
          <input
            type="number"
            name="priceMax"
            placeholder="Max Price"
            value={filters.priceMax}
            onChange={handleFilterChange}
          />
          <button onClick={applyFilters}>Apply Filters</button>
          <button onClick={clearFilters}>Clear Filters</button>
        </div>
      )}
      <div className="extrabutton">
        <button onClick={getBiggestWinners}>Biggest Winners</button>
        <button onClick={getBiggestLosers}>Biggest Losers</button>
      </div>
      <br />
      <button
        className={`mainbutton ${selectedTable === "main" ? "toggled" : ""}`}
        onClick={() => handleTableChange("main")}
        disabled={selectedTable === "main"}
      >
        Main Table
      </button>
      <button
        className={`mainbutton ${selectedTable === "watchlist" ? "toggled" : ""}`}
        onClick={() => handleTableChange("watchlist")}
        disabled={selectedTable === "watchlist"}
      >
        Watchlist
      </button>

      {renderTable()}
    </div>
  );
}

export default App;