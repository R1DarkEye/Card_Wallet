"use client";

import React from "react";

export default function ProfilePage() {
  return (
    <div className="profile-container">
      <div className="profile-header">
        <p className="greeting">Good morning, John. 👋</p>
        <h1 className="main-title">Profile</h1>
        <p className="subtitle">Manage your account settings and preferences.</p>
      </div>

      <div className="profile-grid">
        <div className="profile-main-column">
          {/* Profile Information Section */}
          <section className="profile-section card">
            <div className="section-header">
              <h2 className="section-title">Profile Information</h2>
              <button className="edit-btn">
                <span className="icon">✏️</span> Edit Profile
              </button>
            </div>
            <div className="profile-info-content">
              <div className="avatar-wrapper">
                <div className="profile-large-avatar">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" alt="John Doe" />
                  <button className="change-photo-btn">📷</button>
                </div>
              </div>
              <div className="info-fields">
                <div className="info-row">
                  <span className="info-label">Full Name</span>
                  <span className="info-value">John Doe</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Email Address</span>
                  <span className="info-value">
                    john.doe@email.com <span className="verified-badge">✓ Verified</span>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Phone Number</span>
                  <span className="info-value">
                    +1 (555) 123-4567 <span className="verified-badge">✓ Verified</span>
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Member Since</span>
                  <span className="info-value">May 12, 2024</span>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section className="preferences-section">
            <h2 className="section-title-outer">Preferences</h2>
            <div className="preference-items">
              <PreferenceItem 
                icon="✉️" 
                iconBg="#f5f3ff"
                title="Communication Preferences" 
                description="Choose how you want to receive updates and alerts" 
              />
              <PreferenceItem 
                icon="🔔" 
                iconBg="#eff6ff"
                title="Notification Settings" 
                description="Manage your email and push notifications" 
              />
              <PreferenceItem 
                icon="🛡️" 
                iconBg="#ecfdf5"
                title="Privacy Settings" 
                description="Control your data and privacy preferences" 
              />
              <PreferenceItem 
                icon="🎨" 
                iconBg="#fff7ed"
                title="Appearance" 
                description="Customize the appearance of your dashboard" 
              />
              <PreferenceItem 
                icon="🌐" 
                iconBg="#f5f3ff"
                title="Language" 
                description="Select your preferred language" 
              />
              
              <div className="help-box">
                <div className="help-icon-wrapper">
                  <span className="help-icon">🕙</span>
                </div>
                <div className="help-content">
                  <h3>Need Help?</h3>
                  <p>We're here to help you with any questions or issues.</p>
                </div>
                <button className="contact-support-btn">
                  <span className="icon">🎧</span> Contact Support
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="profile-sidebar-column">
          {/* Account Security Widget */}
          <section className="sidebar-widget card">
            <div className="widget-header">
              <h3 className="widget-title">Account Security</h3>
              <span className="widget-icon-top">🛡️</span>
            </div>
            <div className="widget-content">
              <div className="widget-row">
                <span className="row-label">Two-Factor Authentication</span>
                <span className="row-value success">Enabled ❯</span>
              </div>
              <div className="widget-row">
                <div className="row-label-group">
                  <span className="row-label">Password</span>
                  <span className="row-sub">Updated 2 weeks ago</span>
                </div>
                <span className="row-value">•••••••• ❯</span>
              </div>
              <div className="widget-row">
                <span className="row-label">Trusted Devices</span>
                <span className="row-value">3 devices ❯</span>
              </div>
              <button className="manage-link">Manage Security →</button>
            </div>
          </section>

          {/* Account Storage Widget */}
          <section className="sidebar-widget card">
            <div className="widget-header">
              <h3 className="widget-title">Account Storage</h3>
              <span className="widget-icon-top">☁️</span>
            </div>
            <div className="widget-content">
              <div className="storage-info">
                <span className="storage-label">Storage Used</span>
                <span className="storage-value">2.4 GB of 10 GB</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "24%" }}></div>
              </div>
              <span className="progress-text">24% Used</span>
              <button className="manage-link">Manage Storage →</button>
            </div>
          </section>

          {/* Quick Actions Widget */}
          <section className="sidebar-widget transparency">
            <h3 className="widget-title-simple">Quick Actions</h3>
            <div className="quick-actions-list">
              <QuickActionItem 
                icon="📥" 
                title="Download My Data" 
                description="Export your data" 
              />
              <QuickActionItem 
                icon="🗑️" 
                iconColor="#ef4444"
                title="Delete Account" 
                description="Permanently delete your account" 
                isDanger
              />
              <QuickActionItem 
                icon="🚪" 
                title="Sign Out" 
                description="Sign out from all devices" 
              />
            </div>
          </section>
        </div>
      </div>
      
      <footer className="profile-footer">
        <span className="copyright">© 2024 CardVault. All rights reserved.</span>
        <div className="footer-links">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">About Us</a>
        </div>
      </footer>
    </div>
  );
}

function PreferenceItem({ icon, iconBg, title, description }: { icon: string, iconBg: string, title: string, description: string }) {
  return (
    <div className="preference-item card">
      <div className="pref-icon" style={{ backgroundColor: iconBg }}>{icon}</div>
      <div className="pref-info">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="pref-chevron">❯</span>
    </div>
  );
}

function QuickActionItem({ icon, iconColor, title, description, isDanger }: { icon: string, iconColor?: string, title: string, description: string, isDanger?: boolean }) {
  return (
    <div className="quick-action-button">
      <div className="qa-icon-wrapper" style={{ color: iconColor }}>{icon}</div>
      <div className="qa-info">
        <h4 className={isDanger ? "danger-text" : ""}>{title}</h4>
        <p>{description}</p>
      </div>
      <span className="qa-chevron">❯</span>
    </div>
  );
}
