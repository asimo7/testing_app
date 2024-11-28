import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

// Use environment variable for socket URL, falling back to localhost if not provided
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
  const [showFilters, setShowFilters] = useState(true);

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
              Percent Change {sortConfig.key === "percent_change" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th onClick={() => handleSort("VWAP")}>
              VWAP {sortConfig.key === "VWAP" && (sortConfig.direction === "asc" ? "↑" : (sortConfig.direction === "desc" ? "↓" : ""))}
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((warrant) => (
            <tr key={warrant.symbol}>
              <td className={warrant.star ? "starred" : ""}>⭐</td>
              <td>{warrant.date}</td>
              <td>{warrant.symbol}</td>
              <td>{warrant.name}</td>
              <td>{warrant.price}</td>
              <td>{warrant.volume}</td>
              <td className={getChangeClass(warrant.change)}>{warrant.change}</td>
              <td className={getChangeClass(warrant.percent_change)}>{warrant.percent_change}%</td>
              <td>{warrant.VWAP}</td>
              <td>
                <button onClick={() => toggleWatchlist(warrant)}>
                  {watchlist.some((item) => item.symbol === warrant.symbol) ? "Remove" : "Add"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="App">
      <h1>Warrant Watchlist</h1>
      <button onClick={() => setShowFilters(!showFilters)}>
        {showFilters ? "Hide" : "Show"} Filters
      </button>
      {showFilters && (
        <div>
          {/* Filters */}
          <div>
            <input
              type="text"
              name="symbol"
              value={filters.symbol}
              onChange={handleFilterChange}
              placeholder="Filter by Symbol"
            />
            <input
              type="text"
              name="name"
              value={filters.name}
              onChange={handleFilterChange}
              placeholder="Filter by Name"
            />
            <input
              type="number"
              name="priceMin"
              value={filters.priceMin}
              onChange={handleFilterChange}
              placeholder="Min Price"
            />
            <input
              type="number"
              name="priceMax"
              value={filters.priceMax}
              onChange={handleFilterChange}
              placeholder="Max Price"
            />
            <input
              type="number"
              name="volumeMin"
              value={filters.volumeMin}
              onChange={handleFilterChange}
              placeholder="Min Volume"
            />
            <input
              type="number"
              name="volumeMax"
              value={filters.volumeMax}
              onChange={handleFilterChange}
              placeholder="Max Volume"
            />
            <button onClick={applyFilters}>Apply Filters</button>
            <button onClick={clearFilters}>Clear Filters</button>
          </div>
          <div>
            <button onClick={getBiggestWinners}>Biggest Winners</button>
            <button onClick={getBiggestLosers}>Biggest Losers</button>
          </div>
        </div>
      )}
      <div>
        <button onClick={() => setSelectedTable("main")}>Main Table</button>
        <button onClick={() => setSelectedTable("watchlist")}>Watchlist</button>
      </div>
      {renderTable()}
    </div>
  );
}

export default App;