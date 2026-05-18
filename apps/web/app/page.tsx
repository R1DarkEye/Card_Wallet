"use client";

import { useEffect, useState } from "react";
import { generateMnemonic, decrypt, vault, validateMnemonic } from "@cardvault/core";
import { useVaultStore } from "../store/useVaultStore";
import AddCardModal from "../components/AddCardModal";
import CardDetailsModal from "../components/CardDetailsModal";
import { Toast, useToast } from "../components/Toast";
import { DashboardSkeleton } from "../components/Skeletons";
import { SettingsContent } from "./settings/page";
import ProfilePage from "./profile/page";
import {
  db,
  supabase,
  supabaseConfigured,
  setActiveUserId,
  setSupabaseAuthToken
} from "@cardvault/db";

// Use dynamic imports for client-side only PDF/Zip libraries
let jsPDF: any;
let autoTable: any;
let JSZip: any;
let saveAs: any;

const loadBackupLibs = async () => {
  if (!jsPDF) {
    const jspdfModule = await import("jspdf/dist/jspdf.es.min.js");
    jsPDF = jspdfModule.default || jspdfModule;
    autoTable = (await import("jspdf-autotable")).default;
    JSZip = (await import("jszip")).default;
    const saveAsModule = await import("file-saver");
    saveAs = saveAsModule.default || saveAsModule.saveAs || saveAsModule;
  }
};

export default function Home() {
  const [step, setStep] = useState<"welcome" | "generate" | "verify" | "restore">("welcome");
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [restoreMnemonic, setRestoreMnemonic] = useState("");
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewingCard, setViewingCard] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "payment" | "id" | "license" | "insurance" | "documents">("all");
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings" | "profile">("dashboard");
  const { setVaultOpen, isOpen, lockVault } = useVaultStore();
  const { showToast, ToastElement } = useToast();
  const mnemonicStorageKey = "cardvault_mnemonic";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const clearAuthContext = () => {
    setSupabaseAuthToken(null);
    setActiveUserId(null);
    setUserId(null);
  };

  const requestMnemonicAuth = async (mnemonic: string) => {
    const response = await fetch("/api/auth/mnemonic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mnemonic })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Auth failed.");
    }
    return payload as { accessToken: string; userId: string; expiresIn: number };
  };

  const activateVaultSession = async (mnemonic: string) => {
    const { accessToken, userId: nextUserId } = await requestMnemonicAuth(mnemonic);
    setSupabaseAuthToken(accessToken);
    setActiveUserId(nextUserId);
    setUserId(nextUserId);
    sessionStorage.setItem(mnemonicStorageKey, mnemonic);
    await setVaultOpen(mnemonic, nextUserId);
    return nextUserId;
  };

  useEffect(() => {
    if (!isHydrated) return;
    if (isOpen) {
      setIsAuthReady(true);
      return;
    }

    const storedMnemonic = sessionStorage.getItem(mnemonicStorageKey);
    if (!storedMnemonic) {
      setIsAuthReady(true);
      return;
    }

    activateVaultSession(storedMnemonic)
      .catch((error) => {
        console.error("Auto-unlock failed:", error);
        sessionStorage.removeItem(mnemonicStorageKey);
        clearAuthContext();
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, [isHydrated, isOpen]);

  useEffect(() => {
    if (!supabaseConfigured || !userId) return;

    const ensureVault = async () => {
      const { error } = await supabase.from("vaults").upsert({ user_id: userId }, { onConflict: "user_id" });
      if (error) {
        console.error("Vault init failed:", error);
      }
    };

    ensureVault();
  }, [userId]);

  const handleSignOut = async () => {
    sessionStorage.removeItem(mnemonicStorageKey);
    clearAuthContext();
    lockVault();
    setCards([]);
    setStep("welcome");
    setGeneratedMnemonic("");
  };

  const handleRestore = async () => {
    setRestoreError(null);
    setIsRestoring(true);

    try {
      const normalized = restoreMnemonic.trim().toLowerCase();
      if (!validateMnemonic(normalized)) {
        throw new Error("Invalid recovery phrase.");
      }

      await activateVaultSession(normalized);
    } catch (error: any) {
      setRestoreError(error.message || "Restoration failed. Please check your recovery phrase.");
    } finally {
      setIsRestoring(false);
    }
  };

  const fetchCards = async () => {
    if (!userId || !supabaseConfigured) return;
    setIsLoadingCards(true);
    try {
      const allCards = await db.getAllCards();
      const key = vault.getKey();
      
      const sortedRaw = allCards.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      const decryptedCards = (await Promise.all(sortedRaw.map(async (card) => {
        try {
          const decryptedData = await decrypt(
            { ciphertext: card.encrypted, iv: card.iv, tag: card.tag },
            key
          );
          return { ...card, data: JSON.parse(decryptedData) };
        } catch (e) {
          return null;
        }
      }))).filter(c => c !== null);
      
      setCards(decryptedCards);
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const filteredCards = cards.filter((card) => {
    // Apply filter category first
    let categoryMatch = true;
    if (filter === "payment") categoryMatch = card.type === "credit" || card.type === "debit";
    else if (filter === "id") categoryMatch = card.type === "aadhaar" || card.type === "passport";
    else if (filter === "license") categoryMatch = card.type === "driving_licence";
    else if (filter === "insurance") categoryMatch = card.type === "insurance";
    else if (filter === "documents") categoryMatch = !["credit", "debit", "aadhaar", "passport", "driving_licence", "insurance"].includes(card.type);

    if (!categoryMatch) return false;

    // Apply search query
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const data = card.data || {};

    // Search in card number, nickname, fullname, bank name
    return (
      (data.nickname && data.nickname.toLowerCase().includes(query)) ||
      (data.fullname && data.fullname.toLowerCase().includes(query)) ||
      (data.bank_name && data.bank_name.toLowerCase().includes(query)) ||
      (data.cardNumber && data.cardNumber.toLowerCase().includes(query)) ||
      (data.number && data.number.toLowerCase().includes(query)) ||
      (card.type && card.type.toLowerCase().includes(query))
    );
  });

  const displayCards = cards.filter((card) => {
    if (filter === "all") return true;
    if (filter === "payment") return card.type === "credit" || card.type === "debit";
    if (filter === "id") return card.type === "aadhaar" || card.type === "passport";
    if (filter === "license") return card.type === "driving_licence";
    if (filter === "insurance") return card.type === "insurance";
    if (filter === "documents") return !["credit", "debit", "aadhaar", "passport", "driving_licence", "insurance"].includes(card.type);
    return true;
  });

  const getDashboardTitle = () => {
    switch (filter) {
      case "all": return "All Cards";
      case "payment": return "Payment Cards";
      case "id": return "ID Cards";
      case "license": return "Drivers License";
      case "insurance": return "Insurance";
      case "documents": return "All Documents";
      default: return "All Cards";
    }
  };

  const getDashboardSubtitle = () => {
    switch (filter) {
      case "all": return "Your cards, always secure";
      case "payment": return "Securely manage your credit and debit cards";
      case "id": return "International and domestic identification documents";
      case "license": return "Keep your roadway identification handy";
      case "insurance": return "Policy details and coverage information";
      case "documents": return "Your other important digital records";
      default: return "Your cards, always secure";
    }
  };

  const handleDeleteCard = async (id: string) => {
    if (!confirm("Are you sure you want to delete this card? This action cannot be undone.")) return;
    
    setIsLoadingCards(true);
    try {
      await db.deleteCard(id);
      await fetchCards();
      setActiveMenu(null);
    } catch (error) {
      console.error("Delete failed:", error);
      showToast("Failed to delete card", "error");
      setIsLoadingCards(false);
    }
  };

  const handleBackup = async () => {
    if (cards.length === 0) {
      showToast("No cards to backup.", "info");
      return;
    }

    try {
      await loadBackupLibs();
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const folderName = `CardVault-Backup-${timestamp}`;
      const zipFolder = zip.folder(folderName);

      if (!zipFolder) throw new Error("Could not create zip folder");

      // Group cards by type
      const grouped = cards.reduce((acc: any, card) => {
        if (!acc[card.type]) acc[card.type] = [];
        acc[card.type].push(card);
        return acc;
      }, {});

      for (const [type, typeCards] of Object.entries(grouped)) {
        const doc = new jsPDF();
        const typeName = type.toString().replace("_", " ").toUpperCase();
        
        doc.setFontSize(20);
        doc.text(`${typeName} BACKUP`, 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated on ${new Date().toLocaleString()}`, 14, 30);

        const tableData = (typeCards as any[]).map(card => {
          const entries = Object.entries(card.data)
            .filter(([key]) => !['nickname', 'network'].includes(key))
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n");
          
          return [
            card.data.nickname || "N/A",
            entries,
            new Date(card.updatedAt).toLocaleDateString()
          ];
        });

        autoTable(doc, {
          startY: 40,
          head: [['Nickname/Name', 'Details', 'Last Updated']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235] },
          styles: { fontSize: 9, cellPadding: 5 }
        });

        const pdfBlob = doc.output("blob");
        zipFolder.file(`${type}-cards.pdf`, pdfBlob);
      }

      // Add a summary JSON file just in case
      zipFolder.file("metadata.json", JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalCards: cards.length,
        version: "1.0"
      }, null, 2));

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
    } catch (error) {
      console.error("Backup failed:", error);
      showToast("Failed to generate backup.", "error");
    }
  };

  useEffect(() => {
    if (isOpen && userId && supabaseConfigured) {
      fetchCards();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenu(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  if (!isHydrated || !isAuthReady) {
    return (
      <main className="dashboard-container">
        <div className="dashboard-content">
          <DashboardSkeleton />
        </div>
      </main>
    );
  }

  if (isOpen) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="logo-icon">🛡️</div>
            <span className="logo-text">CardVault</span>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-group">
              <div className={`nav-item ${activeTab === "dashboard" && filter === "all" ? "active" : ""}`} onClick={() => { setActiveTab("dashboard"); setFilter("all"); }}>
                <span className="nav-icon">🏠</span> Home
              </div>
              <div className={`nav-item ${activeTab === "dashboard" && filter === "payment" ? "active" : ""}`} onClick={() => { setActiveTab("dashboard"); setFilter("payment"); }}>
                <span className="nav-icon">💳</span> Payment Cards
              </div>
              <div className={`nav-item ${activeTab === "dashboard" && filter === "id" ? "active" : ""}`} onClick={() => { setActiveTab("dashboard"); setFilter("id"); }}>
                <span className="nav-icon">🪪</span> ID Cards
              </div>
              <div className={`nav-item ${activeTab === "dashboard" && filter === "license" ? "active" : ""}`} onClick={() => { setActiveTab("dashboard"); setFilter("license"); }}>
                <span className="nav-icon">🚗</span> Drivers License
              </div>
              <div className={`nav-item ${activeTab === "dashboard" && filter === "insurance" ? "active" : ""}`} onClick={() => { setActiveTab("dashboard"); setFilter("insurance"); }}>
                <span className="nav-icon">🛡️</span> Insurance
              </div>
              <div className={`nav-item ${activeTab === "dashboard" && filter === "documents" ? "active" : ""}`} onClick={() => { setActiveTab("dashboard"); setFilter("documents"); }}>
                <span className="nav-icon">📁</span> All Documents
              </div>
            </div>

            <div className="nav-group bottom">
              <div className="nav-item">
                <span className="nav-icon">🔒</span> Security
              </div>
              <div className="nav-item">
                <span className="nav-icon">🔔</span> Alerts <span className="badge">3</span>
              </div>
              <div className={`nav-item ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>
                <span className="nav-icon">👤</span> Profile
              </div>
              <div className={`nav-item ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
                <span className="nav-icon">⚙️</span> Settings
              </div>
              <div className="nav-item">
                <span className="nav-icon">❓</span> Help
              </div>
              <div className="nav-item logout" onClick={handleSignOut}>
                <span className="nav-icon">🚪</span> Sign Out
              </div>
            </div>
          </nav>

          <div className="promo-box">
            <div className="promo-icon">✨</div>
            <div className="promo-title">Your data is 100% secure</div>
            <div className="promo-desc">Zero-knowledge encryption protects everything you store here.</div>
          </div>
        </aside>

        <main className="main-viewport">
          <header className="main-header">
            <div className="header-search">
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search cards, documents..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />
                <span className="search-shortcut">⌘ K</span>

                {isSearchFocused && searchQuery.trim() && (
                  <div className="search-results-dropdown">
                    {filteredCards.length > 0 ? (
                      filteredCards.map((card) => (
                        <div 
                          key={card.id} 
                          className="search-result-item"
                          onClick={() => setViewingCard(card)}
                        >
                          <div className="result-icon">
                            {card.type === 'credit' || card.type === 'debit' ? '💳' : '📄'}
                          </div>
                          <div className="result-info">
                            <div className="result-name">{card.data.nickname || card.data.fullname || 'Untitled Card'}</div>
                            <div className="result-sub">
                              {card.type.toUpperCase()} {card.data.cardNumber ? `•••• ${card.data.cardNumber.slice(-4)}` : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="search-no-results">No results found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="header-user">
              <div className="notification-trigger">
                <span>🔔</span>
                <div className="dot"></div>
              </div>
              <div className="user-profile">
                <div className="avatar">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" alt="User" />
                </div>
                <span className="user-name">John Doe</span>
                <span className="chevron">▼</span>
              </div>
            </div>
          </header>

          <div className="content-area">
            {activeTab === "settings" ? (
              <SettingsContent 
                isEmbedded 
                onBackup={handleBackup}
                onSignOut={handleSignOut}
              />
            ) : activeTab === "profile" ? (
              <ProfilePage />
            ) : (
              <>
                <div className="page-intro">
                  <div className="intro-header">
                    <div>
                      <p className="greeting">Good morning, John</p>
                      <h1 className="main-title">{getDashboardSubtitle()}</h1>
                    </div>
                    <div className="header-actions">
                      <button className="action-btn filter-btn">
                        <span className="btn-icon">⏳</span> Filter
                      </button>
                      <button className="action-btn add-btn" onClick={() => setShowAddModal(true)}>
                        <span className="btn-icon">+</span> Add New Card
                      </button>
                    </div>
                  </div>
                </div>

                <div className="category-tabs">
                  <div className={`category-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
                    <span>🏠</span> All Cards
                  </div>
                  <div className={`category-tab ${filter === "payment" ? "active" : ""}`} onClick={() => setFilter("payment")}>
                    <span>💳</span> Payment
                  </div>
                  <div className={`category-tab ${filter === "id" ? "active" : ""}`} onClick={() => setFilter("id")}>
                    <span>🪪</span> ID Cards
                  </div>
                  <div className={`category-tab ${filter === "license" ? "active" : ""}`} onClick={() => setFilter("license")}>
                    <span>🚗</span> License
                  </div>
                  <div className={`category-tab ${filter === "insurance" ? "active" : ""}`} onClick={() => setFilter("insurance")}>
                    <span>🛡️</span> Insurance
                  </div>
                </div>

                <div className="dashboard-grid">
                  <div className="main-col">
                    {isLoadingCards ? (
                      <DashboardSkeleton />
                    ) : displayCards.length === 0 ? (
                      <div className="empty-state-card">
                        <div className="empty-icon">📂</div>
                        <h3>No {getDashboardTitle().toLowerCase()} found</h3>
                        <p>Start by adding your first record securely.</p>
                        <button className="btn-primary-add" onClick={() => setShowAddModal(true)}>+ Add New</button>
                      </div>
                    ) : (
                      <div className="card-list">
                        {displayCards.map((card) => {
                          const displayNum = card.data.cardNumber || card.data.licenceNumber || card.data.policyNumber || card.data.aadhaarNumber || card.data.passportNumber || "";
                          const last4 = displayNum.toString().replace(/\s/g, '').slice(-4);
                          const network = (card.data.network || "visa").toLowerCase();
                          
                          const getCardColor = (type: string, net: string) => {
                            if (type === "driving_licence") return "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                            if (type === "insurance") return "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
                            if (net === "mastercard") return "linear-gradient(135deg, #ff5f00 0%, #eb001b 100%)";
                            if (net === "visa") return "linear-gradient(135deg, #1a1f71 0%, #0061b2 100%)";
                            return "linear-gradient(135deg, #475569 0%, #1e293b 100%)";
                          };

                          return (
                            <div key={card.id} className="card-list-item" onClick={() => setViewingCard(card)}>
                              <div className="item-visual">
                                <div className="large-visual-card" style={{ background: getCardColor(card.type, network) }}>
                                    <div className="visual-chip"></div>
                                    <div className="visual-number">•••• •••• {last4 || "0000"}</div>
                                </div>
                              </div>
                              <div className="item-info">
                                  <h4 className="item-title">{card.data.nickname || card.data.cardName || "Unified Card"}</h4>
                                  <p className="item-subtitle">
                                    {card.type.replace('_', ' ').toUpperCase()} • {network.toUpperCase()} {last4 ? `**** ${last4}` : ""}
                                  </p>
                              </div>
                              <div className="item-meta">
                                  <label>Updated</label>
                                  <span>{new Date(card.updatedAt).toLocaleDateString()}</span>
                              </div>
                              <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                                  <button className="btn-dots" onClick={() => setActiveMenu(activeMenu === card.id ? null : card.id)}>⋮</button>
                                    {activeMenu === card.id && (
                                        <div className="dropdown">
                                            <button onClick={() => { 
                                              setEditingCard({
                                                id: card.id,
                                                type: card.type,
                                                data: card.data
                                              }); 
                                              setShowAddModal(true); 
                                              setActiveMenu(null); 
                                            }}>Edit</button>
                                            <button className="delete" onClick={() => handleDeleteCard(card.id)}>Delete</button>
                                        </div>
                                    )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="side-col">
                    <div className="widget-card security-widget">
                      <h3>Security Overview</h3>
                      <div className="security-gauge">
                        <svg className="gauge-svg" viewBox="0 0 100 100">
                          <circle className="gauge-bg" cx="50" cy="50" r="45" />
                          <circle className="gauge-fill" cx="50" cy="50" r="45" strokeDasharray="283" strokeDashoffset="5.6" />
                        </svg>
                        <div className="gauge-text">
                          <span className="gauge-percent">98%</span>
                          <span className="gauge-label">Strong</span>
                        </div>
                      </div>
                      <p className="widget-desc">Your vault security is excellent. Your 12-word recovery phrase is the only way to access your data.</p>
                    </div>

                    <div className="widget-card actions-widget">
                      <h3>Quick Actions</h3>
                      <div className="widget-actions-list">
                        <button className="widget-action-btn" onClick={() => setShowAddModal(true)}>
                          <span className="action-icon add">+</span>
                          <div className="action-text">
                            <span className="action-label">Add New Card</span>
                            <span className="action-sub">Register a new document</span>
                          </div>
                        </button>
                        <button className="widget-action-btn" onClick={handleBackup}>
                          <span className="action-icon backup">💾</span>
                          <div className="action-text">
                            <span className="action-label">Backup Cards</span>
                            <span className="action-sub">Export your encrypted vault</span>
                          </div>
                        </button>
                        <button className="widget-action-btn" onClick={handleSignOut}>
                          <span className="action-icon lock">🔒</span>
                          <div className="action-text">
                            <span className="action-label">Lock Vault</span>
                            <span className="action-sub">Immediate secure logout</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="widget-card activity-widget">
                      <h3>Recent Activity</h3>
                      <div className="activity-list">
                        <div className="activity-item">
                          <div className="activity-bullet"></div>
                          <div className="activity-content">
                              <span className="activity-text">Vault unlocked</span>
                              <span className="activity-time">2 mins ago</span>
                          </div>
                        </div>
                        {cards.slice(0, 2).map(card => (
                          <div key={card.id} className="activity-item">
                            <div className="activity-bullet"></div>
                            <div className="activity-content">
                                <span className="activity-text">{card.data.nickname || card.type} updated</span>
                                <span className="activity-time">{new Date(card.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {showAddModal && (
          <div className="fullscreen-overlay">
            <AddCardModal 
              editData={editingCard}
              onClose={() => {
                setShowAddModal(false);
                setEditingCard(null);
              }} 
              onSuccess={() => {
                setShowAddModal(false);
                setEditingCard(null);
                setIsLoadingCards(true);
                fetchCards();
              }} 
            />
          </div>
        )}

        {viewingCard && (
          <CardDetailsModal 
            card={viewingCard}
            onClose={() => setViewingCard(null)}
          />
        )}

        <style jsx>{`
          .fullscreen-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            z-index: 9999;
            background: #fff;
            animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }

          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          .dashboard-layout { display: flex; height: 100vh; background: #f8fafc; color: #1e293b; }
          .sidebar { width: 260px; background: #ffffff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; padding: 24px 16px; }
          .sidebar-header { display: flex; align-items: center; gap: 12px; padding: 0 12px 32px; }
          .logo-icon { font-size: 24px; }
          .logo-text { font-weight: 800; font-size: 20px; color: #0f172a; }
          .sidebar-nav { flex: 1; display: flex; flex-direction: column; overflow-y: auto; gap: 32px; }
          .nav-group { display: flex; flex-direction: column; gap: 4px; }
          .nav-group.bottom { margin-top: auto; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 24px; }
          .nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 500; color: #64748b; cursor: pointer; transition: all 0.2s; }
          .nav-item:hover { background: #f1f5f9; color: #0f172a; }
          .nav-item.active { background: #eff6ff; color: #2563eb; }
          .nav-item.logout:hover { color: #ef4444; background: #fef2f2; }
          .badge { margin-left: auto; background: #fee2e2; color: #ef4444; font-size: 10px; padding: 2px 6px; border-radius: 10px; }
          .promo-box { background: #eff6ff; border-radius: 16px; padding: 16px; border: 1px solid #dbeafe; }
          .promo-icon { font-size: 20px; margin-bottom: 8px; }
          .promo-title { font-weight: 700; font-size: 13px; color: #1e3a8a; margin-bottom: 4px; }
          .promo-desc { font-size: 11px; color: #3b82f6; line-height: 1.4; }

          .main-viewport { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .main-header { height: 72px; background: #ffffff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; padding: 0 32px; flex-shrink: 0; }
          .search-box { position: relative; width: 400px; }
          .search-icon { position: absolute; left: 12px; top: 10px; color: #94a3b8; }
          .search-box input { width: 100%; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 40px; font-size: 14px; outline: none; transition: border-color 0.2s; }
          .search-box input:focus { border-color: #2563eb; }
          .search-shortcut { position: absolute; right: 12px; top: 10px; font-size: 10px; color: #94a3b8; border: 1px solid #cbd5e1; padding: 2px 4px; border-radius: 4px; }
          
          .search-results-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            margin-top: 8px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            z-index: 50;
            max-height: 400px;
            overflow-y: auto;
            padding: 8px;
          }
          .search-result-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            border-radius: 8px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .search-result-item:hover {
            background: #f1f5f9;
          }
          .result-icon {
            font-size: 20px;
          }
          .result-name {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
          }
          .result-sub {
            font-size: 11px;
            color: #64748b;
          }
          .search-no-results {
            padding: 16px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
          }

          .header-user { display: flex; align-items: center; gap: 24px; }
          .notification-trigger { position: relative; font-size: 20px; cursor: pointer; }
          .notification-trigger .dot { position: absolute; top: 0; right: 0; width: 8px; height: 8px; background: #2563eb; border-radius: 50%; border: 2px solid #fff; }
          .user-profile { display: flex; align-items: center; gap: 8px; cursor: pointer; }
          .avatar { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; overflow: hidden; }
          .user-name { font-size: 14px; font-weight: 600; color: #0f172a; }
          .chevron { font-size: 10px; color: #64748b; }

          .content-area { flex: 1; overflow-y: auto; padding: 32px 40px; }
          .page-intro { margin-bottom: 32px; }
          .intro-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }
          .header-actions { display: flex; gap: 12px; }
          .action-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 10px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid #e2e8f0;
          }
          .filter-btn {
            background: white;
            color: #1e293b;
          }
          .filter-btn:hover {
            background: #f8fafc;
          }
          .add-btn {
            background: #2563eb;
            color: white;
            border: none;
          }
          .add-btn:hover {
            background: #1d4ed8;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
          }
          .btn-icon {
            font-size: 16px;
            font-weight: bold;
          }
          .greeting { font-size: 14px; font-weight: 600; color: #64748b; margin-bottom: 4px; }
          .main-title { font-size: 28px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }

          .dashboard-grid { display: grid; grid-template-columns: 1fr 320px; gap: 32px; align-items: start; }
          .card-list { display: flex; flex-direction: column; gap: 12px; }
          .card-list-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 20px; cursor: pointer; transition: all 0.2s; }
          .card-list-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05); }
          .item-visual { flex-shrink: 0; }
          .item-info { flex: 1; }
          .item-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .item-subtitle { font-size: 12px; color: #64748b; font-weight: 500; }
          .item-meta { width: 120px; }
          .item-meta label { display: block; font-size: 10px; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
          .item-meta span { font-size: 13px; font-weight: 600; color: #334155; }
          .btn-dots { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 8px; border-radius: 8px; }
          .btn-dots:hover { background: #f1f5f9; color: #0f172a; }

          .widget-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 24px; margin-bottom: 24px; }
          .widget-card h3 { font-size: 16px; font-weight: 700; margin: 0 0 20px; color: #0f172a; }
          .widget-desc { font-size: 12px; color: #64748b; line-height: 1.6; text-align: center; }
          .widget-actions-list { display: flex; flex-direction: column; gap: 8px; }
          .widget-action-btn { width: 100%; display: flex; align-items: center; gap: 16px; padding: 12px; background: #fff; border: 1px solid #f1f5f9; border-radius: 12px; cursor: pointer; text-align: left; transition: all 0.2s; }
          .widget-action-btn:hover { border-color: #e2e8f0; background: #f8fafc; }
          .action-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
          .action-icon.add { background: #eff6ff; color: #2563eb; }
          .action-icon.backup { background: #f0fdf4; color: #16a34a; }
          .action-icon.lock { background: #fff7ed; color: #ea580c; }
          .action-label { display: block; font-size: 13px; font-weight: 700; color: #0f172a; }
          .action-sub { display: block; font-size: 11px; color: #64748b; }

          .activity-list { display: flex; flex-direction: column; gap: 16px; }
          .activity-item { display: flex; gap: 12px; }
          .activity-bullet { width: 8px; height: 8px; border-radius: 50%; background: #e2e8f0; margin-top: 5px; flex-shrink: 0; }
          .activity-content { display: flex; flex-direction: column; gap: 2px; }
          .activity-text { font-size: 13px; font-weight: 600; color: #334155; }
          .activity-time { font-size: 11px; color: #94a3b8; }

          .item-actions { position: relative; }
          .dropdown { position: absolute; right: 0; top: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 10; padding: 4px; min-width: 120px; }
          .dropdown button { width: 100%; text-align: left; padding: 8px 12px; border: none; background: none; font-size: 13px; cursor: pointer; border-radius: 4px; }
          .dropdown button:hover { background: #f1f5f9; }
          .dropdown button.delete { color: #ef4444; }

          .empty-state-card { background: #fff; border: 2px dashed #e2e8f0; border-radius: 20px; padding: 60px 40px; text-align: center; }
          .empty-icon { font-size: 48px; margin-bottom: 16px; }
          .empty-state-card h3 { font-size: 18px; margin-bottom: 8px; }
          .empty-state-card p { color: #64748b; font-size: 14px; margin-bottom: 24px; }
          .btn-primary-add { background: #2563eb; color: #fff; border: none; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; }
        `}</style>
        {ToastElement}
      </div>
    );
  }

  const handleStart = () => {
    const mnemonic = generateMnemonic();
    setGeneratedMnemonic(mnemonic);
    setStep("generate");
  };

  const handleConfirm = async () => {
    setIsInitializing(true);
    try {
      await activateVaultSession(generatedMnemonic);
      setStep("welcome");
    } catch (e: any) {
      showToast("Setup failed: " + e.message, "error");
    } finally {
      setIsInitializing(false);
    }
  };


  if (step === "welcome") {
    return (
      <main className="onboarding-container">
        <div className="onboarding-card">
          <div className="hero-section">
            <div className="logo-badge">🛡️</div>
            <h1>CardVault</h1>
            <p className="subtitle">Zero-knowledge. Offline-first. Your digital identity, secured by you.</p>
          </div>
          
          <div className="action-buttons">
            <button className="btn-primary" onClick={handleStart}>
              Create New Vault
            </button>
            <button className="btn-secondary" onClick={() => setStep("restore")}>
              Restore Existing
            </button>
          </div>
          
          <div className="footer-info">
            <p>MIT Licensed • Open Source • No Cloud Storage</p>
          </div>
        </div>
        {ToastElement}

        <style jsx>{`
          .onboarding-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: radial-gradient(circle at top right, #1e1b4b, #0f172a); }
          .onboarding-card { max-width: 500px; width: 100%; padding: 48px; text-align: center; background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 32px; }
          .hero-section { margin-bottom: 40px; }
          .logo-badge { font-size: 48px; margin-bottom: 16px; display: inline-block; background: rgba(255, 255, 255, 0.05); padding: 20px; border-radius: 24px; }
          h1 { font-size: 2.5rem; margin-bottom: 12px; color: #fff; font-weight: 800; }
          .subtitle { color: #94a3b8; line-height: 1.6; }
          .action-buttons { display: flex; flex-direction: column; gap: 12px; }
          .btn-primary { background: #2563eb; color: white; border: none; padding: 16px; border-radius: 12px; font-weight: 600; cursor: pointer; }
          .btn-secondary { background: rgba(255, 255, 255, 0.05); color: white; border: 1px solid rgba(255, 255, 255, 0.1); padding: 16px; border-radius: 12px; font-weight: 600; cursor: pointer; }
          .footer-info { margin-top: 40px; font-size: 0.8rem; color: #64748b; }
        `}</style>
      </main>
    );
  }

  if (step === "restore") {
    return (
      <main className="onboarding-container">
        <div className="onboarding-card">
          <h2>Restore Existing Vault</h2>
          <p className="subtitle">Paste your 12-word recovery phrase to unlock your vault.</p>

          <textarea
            className="mnemonic-input"
            placeholder="word1 word2 word3 ..."
            value={restoreMnemonic}
            onChange={(e) => setRestoreMnemonic(e.target.value)}
            rows={4}
          />

          {restoreError && <div className="restore-error">{restoreError}</div>}

          <button className="btn-primary" onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? "Unlocking..." : "Unlock Vault"}
          </button>

          <button className="btn-secondary" onClick={() => setStep("welcome")}>
            Back
          </button>
        </div>

        <style jsx>{`
          .onboarding-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background: radial-gradient(circle at top right, #1e1b4b, #0f172a); }
          .onboarding-card { max-width: 520px; gap: 20px; display: flex; flex-direction: column; background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(20px); padding: 40px; border-radius: 32px; border: 1px solid rgba(255, 255, 255, 0.1); }
          h2 { color: white; font-weight: 800; margin: 0; }
          .subtitle { color: #94a3b8; }
          .mnemonic-input { width: 100%; min-height: 120px; padding: 14px; border-radius: 12px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12); color: white; font-size: 0.95rem; line-height: 1.5; }
          .restore-error { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; padding: 10px 12px; border-radius: 12px; font-size: 0.85rem; }
          .btn-primary { background: #2563eb; color: white; border: none; padding: 14px; border-radius: 12px; cursor: pointer; }
          .btn-secondary { background: none; color: #94a3b8; border: none; cursor: pointer; }
        `}</style>
      </main>
    );
  }

  if (step === "generate") {
    return (
      <main className="onboarding-container">
        <div className="onboarding-card">
          <h2>Your Secret Recovery Phrase</h2>
          <p className="warning-text">
            Write down these 12 words in order and keep them safe. 
            If you lose them, your data is gone forever.
          </p>

          <div className="mnemonic-grid">
            {generatedMnemonic.split(" ").map((word, i) => (
              <div key={i} className="mnemonic-word group hover:bg-white/10 transition-all duration-200">
                <span className="mnemonic-index group-hover:bg-blue-500/20 group-hover:text-blue-400">{i + 1}</span>
                {word}
              </div>
            ))}
          </div>

          <button className="btn-primary" style={{ width: "100%" }} onClick={() => setStep("verify")}>
            I've Written It Down
          </button>
          <button
            className="btn-secondary copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(generatedMnemonic);
              showToast('Mnemonic copied to clipboard!', 'success');
            }}
          >
            Copy to Clipboard
          </button>
        </div>
        {ToastElement}

        <style jsx>{`
          .onboarding-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
            background: radial-gradient(circle at bottom left, #1e1b4b, #0f172a);
          }
          .onboarding-card {
            max-width: 600px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          }
          h2 {
            color: white;
            font-weight: 800;
            margin-bottom: 8px;
            font-size: 1.5rem;
          }
          .warning-text {
            color: #fca5a5;
            margin-bottom: 32px;
            font-size: 1rem;
            line-height: 1.5;
          }
          .mnemonic-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 32px;
          }
          .mnemonic-word {
            background: rgba(255, 255, 255, 0.1);
            padding: 16px;
            border-radius: 12px;
            color: white;
            font-family: monospace;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            font-weight: bold;
            text-transform: uppercase;
          }
          .mnemonic-index {
            color: #94a3b8;
            margin-right: 8px;
          }
          .btn-primary {
            background: #2563eb;
            color: white;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
          }
          .btn-primary:hover {
            background: #1e40af;
          }
          .btn-secondary {
            background: #4ade80;
            color: white;
            border: none;
            padding: 16px;
            border-radius: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
          }
          .btn-secondary:hover {
            background: #16a34a;
          }
          .copy-btn {
            margin-top: 10px;
            width: 100%;
          }
        `}</style>
      </main>
    );
  }

  if (step === "verify") {
    return (
      <main className="onboarding-container">
        <div className="onboarding-card">
          <h2>Verify Recovery Phrase</h2>
          <p className="subtitle">Enter your 12-word phrase to continue.</p>
          <textarea
            className="mnemonic-input"
            value={restoreMnemonic}
            onChange={(e) => setRestoreMnemonic(e.target.value)}
            rows={4}
          />
          <button 
            className="btn-primary" 
            onClick={async () => {
                if (restoreMnemonic.trim().toLowerCase() === generatedMnemonic) {
                    await handleConfirm();
                } else {
                    showToast("Phrase does not match. Please try again.", "error");
                }
            }} 
            disabled={isInitializing}
          >
            {isInitializing ? "Verifying..." : "Finish Setup"}
          </button>
        </div>
        {ToastElement}
        <style jsx>{`
          .onboarding-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #0f172a; }
          .onboarding-card { max-width: 520px; background: rgba(255,255,255,0.03); padding: 40px; border-radius: 32px; }
          h2 { color: white; margin-bottom: 8px; }
          .subtitle { color: #94a3b8; margin-bottom: 24px; }
          .mnemonic-input { width: 100%; padding: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: white; margin-bottom: 24px; }
          .btn-primary { width: 100%; background: #2563eb; color: white; border: none; padding: 16px; border-radius: 12px; cursor: pointer; }
        `}</style>
      </main>
    );
  }

  return null;
}


