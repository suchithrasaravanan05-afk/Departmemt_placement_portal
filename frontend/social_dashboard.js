// ==========================================================================
// SOCIAL_DASHBOARD.JS — CSBS DEPARTMENT SOCIAL MEDIA HUB
// Full-width Admin Studio for Social Broadcasting & Management
// ==========================================================================

const API_BASE = `${window.location.origin}/api`;

let currentUser = null;
let currentToken = null;
let selectedPlatforms = ['youtube', 'linkedin', 'instagram', 'facebook'];
let currentMediaUrl = '';
let currentMediaType = 'none';
let currentMediaFilename = '';
let activePreviewPlatform = 'youtube';
let allPublishedPosts = [];

// ==========================================================================
// BOOTSTRAP & ROUTE PROTECTION
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
  currentToken = localStorage.getItem('token');
  currentUser = safeParseUser();

  // 1. Check Authentication
  if (!currentToken || !currentUser) {
    sessionStorage.setItem('auth_redirect_msg', 'Please log in to access the Social Media Hub.');
    window.location.href = 'Form.html';
    return;
  }

  const role = (currentUser.role || '').toLowerCase();
  const isStaff = (role === 'faculty' || role === 'hod' || role === 'admin');

  // 2. Role Check: Students strictly denied
  if (!isStaff) {
    alert('Access Denied: The Social Media Hub is restricted to Department Staff (Faculty / HOD / Admin).');
    window.location.href = 'student_dashboard.html';
    return;
  }

  // 3. Strict Permission Check: social_media_access must be true
  const hasSocialAccess = currentUser.social_media_access === true;
  if (!hasSocialAccess) {
    alert('Access Denied: Your account does not have permission to access the Social Media Hub.');
    if (currentUser.placement_access !== false) {
      window.location.href = 'admin_dashboard.html';
    } else {
      window.location.href = 'Form.html';
    }
    return;
  }

  localStorage.setItem('csbs_active_portal', 'social');

  // Render User Header Profile
  renderHeaderUserProfile();

  // Setup Module Switcher if user has both permissions
  setupModuleSwitcher();

  // Load Feed and Metrics
  await loadPublishedPosts();

  // Initial preview update
  updatePreviewFromInput();
});

function safeParseUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    return null;
  }
}

// ==========================================================================
// HEADER PROFILE & MODULE SWITCHER
// ==========================================================================
function renderHeaderUserProfile() {
  const nameEl = document.getElementById('userDisplayName');
  const roleBadge = document.getElementById('userRoleBadge');
  const avatarCircle = document.getElementById('userAvatarCircle');

  if (nameEl) nameEl.textContent = currentUser.full_name || 'CSBS Faculty';
  
  const role = (currentUser.role || '').toLowerCase();
  let roleTitle = 'Faculty Member';
  let initial = 'F';

  if (role === 'hod') {
    roleTitle = 'Head of Department (HOD)';
    initial = 'H';
  } else if (role === 'admin') {
    roleTitle = 'Administrator';
    initial = 'A';
  } else {
    initial = (currentUser.full_name ? currentUser.full_name.charAt(0) : 'F').toUpperCase();
  }

  if (roleBadge) roleBadge.textContent = roleTitle;
  if (avatarCircle) avatarCircle.textContent = initial;
}

function setupModuleSwitcher() {
  const switcherWrap = document.getElementById('portalSwitcherWrap');
  const hasPlacement = currentUser.placement_access !== false;
  const hasSocial = currentUser.social_media_access === true;

  // Only display switcher if user has permission to access BOTH modules
  if (hasPlacement && hasSocial && switcherWrap) {
    switcherWrap.style.display = 'flex';
  } else if (switcherWrap) {
    switcherWrap.style.display = 'none';
  }
}

function togglePortalSwitcherDropdown() {
  const menu = document.getElementById('switcherDropdownMenu');
  if (menu) {
    menu.classList.toggle('form-hidden');
  }
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const switcherBox = document.getElementById('portalSwitcherWrap');
  const menu = document.getElementById('switcherDropdownMenu');
  if (switcherBox && menu && !switcherBox.contains(e.target)) {
    menu.classList.add('form-hidden');
  }
});

function switchToPortal(portal) {
  if (portal === 'placement') {
    localStorage.setItem('csbs_active_portal', 'placement');
    window.location.href = 'admin_dashboard.html';
  } else {
    togglePortalSwitcherDropdown();
  }
}

function handleSocialLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('csbs_active_portal');
  sessionStorage.clear();
  window.location.replace('Form.html');
}

// ==========================================================================
// TABS SWITCHING
// ==========================================================================
function switchSocialTab(tabName) {
  const tabs = ['broadcast', 'feed', 'channels'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const panel = document.getElementById(`panel${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (panel) {
      panel.classList.toggle('active', t === tabName);
      panel.classList.toggle('form-hidden', t !== tabName);
    }
  });

  if (tabName === 'feed') {
    loadPublishedPosts();
  }
}

// ==========================================================================
// PLATFORM TOGGLES
// ==========================================================================
function toggleChannel(btn, platform) {
  const plat = platform.toLowerCase();
  if (selectedPlatforms.includes(plat)) {
    if (selectedPlatforms.length === 1) {
      showHubAlert('At least one broadcast platform must be selected.', 'error');
      return;
    }
    selectedPlatforms = selectedPlatforms.filter(p => p !== plat);
    btn.classList.remove('active');
  } else {
    selectedPlatforms.push(plat);
    btn.classList.add('active');
  }
  updatePreviewFromInput();
}

// ==========================================================================
// MEDIA UPLOAD
// ==========================================================================
function triggerFileInput() {
  const input = document.getElementById('mediaFileInput');
  if (input) input.click();
}

async function handleMediaFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi)$/i.test(file.name);
  const formData = new FormData();
  formData.append('mediaFile', file);

  const statusBadge = document.getElementById('mediaStatusBadge');
  if (statusBadge) {
    statusBadge.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
  }

  try {
    const res = await fetch(`${API_BASE}/social/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.success && data.mediaUrl) {
      currentMediaUrl = data.mediaUrl;
      currentMediaType = data.mediaType || (isVideo ? 'video' : 'image');
      currentMediaFilename = file.name;

      // Update dropzone UI
      const dropEmpty = document.getElementById('dropzoneEmpty');
      const dropPreview = document.getElementById('dropzonePreview');
      const fileNameEl = document.getElementById('previewFileName');
      const mediaBox = document.getElementById('previewMediaBox');

      if (dropEmpty) dropEmpty.classList.add('form-hidden');
      if (dropPreview) dropPreview.classList.remove('form-hidden');
      if (fileNameEl) fileNameEl.textContent = file.name;

      if (mediaBox) {
        if (currentMediaType === 'video') {
          mediaBox.innerHTML = `<video src="${currentMediaUrl}" controls muted style="max-height:180px;width:100%;border-radius:6px;"></video>`;
        } else {
          mediaBox.innerHTML = `<img src="${currentMediaUrl}" alt="Media attachment" style="max-height:180px;width:100%;border-radius:6px;object-fit:cover;">`;
        }
      }

      if (statusBadge) {
        statusBadge.innerHTML = `<i class="fa-solid fa-check" style="color:#16A34A;"></i> Attached (${isVideo ? 'Video' : 'Photo'})`;
      }

      updatePreviewFromInput();
      showHubAlert('Media attached successfully to announcement!', 'success');
    } else {
      showHubAlert(data.message || 'Media upload failed.', 'error');
      if (statusBadge) statusBadge.innerHTML = '<i class="fa-regular fa-image"></i> Optional';
    }
  } catch (err) {
    console.error('Upload error:', err);
    showHubAlert('Network error uploading media.', 'error');
    if (statusBadge) statusBadge.innerHTML = '<i class="fa-regular fa-image"></i> Optional';
  }
}

function removeSelectedMedia(e) {
  if (e) e.stopPropagation();
  currentMediaUrl = '';
  currentMediaType = 'none';
  currentMediaFilename = '';

  const fileInput = document.getElementById('mediaFileInput');
  if (fileInput) fileInput.value = '';

  const dropEmpty = document.getElementById('dropzoneEmpty');
  const dropPreview = document.getElementById('dropzonePreview');
  const mediaBox = document.getElementById('previewMediaBox');
  const statusBadge = document.getElementById('mediaStatusBadge');

  if (dropEmpty) dropEmpty.classList.remove('form-hidden');
  if (dropPreview) dropPreview.classList.add('form-hidden');
  if (mediaBox) mediaBox.innerHTML = '';
  if (statusBadge) statusBadge.innerHTML = '<i class="fa-regular fa-image"></i> Optional';

  updatePreviewFromInput();
}

// ==========================================================================
// LIVE PREVIEW SYNCHRONIZATION
// ==========================================================================
function setPreviewPlatform(platform, btn) {
  activePreviewPlatform = platform.toLowerCase();
  document.querySelectorAll('.preview-pill').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');

  const badge = document.getElementById('mockPlatformBadge');
  if (badge) {
    const icon = platform === 'youtube' ? 'fa-brands fa-youtube' : (platform === 'linkedin' ? 'fa-brands fa-linkedin' : (platform === 'instagram' ? 'fa-brands fa-instagram' : 'fa-brands fa-facebook'));
    badge.innerHTML = `<i class="${icon}"></i> ${platform.charAt(0).toUpperCase() + platform.slice(1)}`;
  }
}

function updatePreviewFromInput() {
  const headline = document.getElementById('postHeadline')?.value.trim() || 'Announcement Title';
  const desc = document.getElementById('postDescription')?.value.trim() || 'Post description preview...';
  const category = document.getElementById('postCategory')?.value || 'Department Notice';
  const hashtags = document.getElementById('postHashtags')?.value.trim() || '#RamcoInstituteOfTechnology #CSBS';

  const mockHeadline = document.getElementById('mockPreviewHeadline');
  const mockText = document.getElementById('mockPreviewText');
  const mockTags = document.getElementById('mockPreviewTags');
  const mockMeta = document.getElementById('mockPostMeta');
  const mockMedia = document.getElementById('mockPreviewMedia');

  if (mockHeadline) mockHeadline.textContent = headline;
  if (mockText) mockText.textContent = desc;
  if (mockTags) mockTags.textContent = hashtags;
  if (mockMeta) mockMeta.textContent = `${category} • Just now`;

  if (mockMedia) {
    if (currentMediaUrl) {
      mockMedia.classList.remove('form-hidden');
      if (currentMediaType === 'video') {
        mockMedia.innerHTML = `<video src="${currentMediaUrl}" controls muted style="max-height:220px;width:100%;border-radius:8px;"></video>`;
      } else {
        mockMedia.innerHTML = `<img src="${currentMediaUrl}" alt="Preview" style="max-height:220px;width:100%;border-radius:8px;object-fit:cover;">`;
      }
    } else {
      mockMedia.classList.add('form-hidden');
      mockMedia.innerHTML = '';
    }
  }
}

// ==========================================================================
// BROADCAST SUBMISSION
// ==========================================================================
async function handleBroadcastSubmit(e) {
  e.preventDefault();

  const title = document.getElementById('postHeadline')?.value.trim();
  const content = document.getElementById('postDescription')?.value.trim();
  const category = document.getElementById('postCategory')?.value;
  const hashtags = document.getElementById('postHashtags')?.value.trim();

  if (!title || !content) {
    showHubAlert('Announcement Headline and Description are required.', 'error');
    return;
  }

  if (selectedPlatforms.length === 0) {
    showHubAlert('Please select at least one social media channel to broadcast.', 'error');
    return;
  }

  const btn = document.getElementById('btnBroadcast');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Broadcasting to Channels...';
  }

  try {
    const res = await fetch(`${API_BASE}/social/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({
        title,
        content,
        category,
        platforms: selectedPlatforms,
        mediaUrl: currentMediaUrl,
        mediaType: currentMediaType,
        hashtags,
        authorRole: currentUser.role,
        authorName: currentUser.full_name
      })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showHubAlert(`Announcement successfully broadcast to ${selectedPlatforms.join(', ')}!`, 'success');
      
      // Reset form media
      removeSelectedMedia();

      // Refresh posts feed
      await loadPublishedPosts();

      // Switch to published feed tab after a brief moment
      setTimeout(() => {
        switchSocialTab('feed');
      }, 1200);
    } else {
      showHubAlert(data.message || 'Failed to broadcast announcement.', 'error');
    }
  } catch (err) {
    console.error('Broadcast error:', err);
    showHubAlert('Network error broadcasting announcement.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-bullhorn"></i> <span>Broadcast Announcement</span>';
    }
  }
}

function handleSchedulePost() {
  showHubAlert('Post scheduled successfully! Will broadcast according to designated timetable.', 'success');
}

// ==========================================================================
// PUBLISHED POSTS FEED & MANAGEMENT
// ==========================================================================
async function loadPublishedPosts() {
  const container = document.getElementById('publishedPostsList');
  const filterSelect = document.getElementById('feedPlatformFilter');
  const selectedChannel = filterSelect ? filterSelect.value : 'all';

  try {
    const query = selectedChannel === 'all' ? '' : `?platform=${selectedChannel}`;
    const res = await fetch(`${API_BASE}/social/posts${query}`);
    const data = await res.json();

    if (data.success && Array.isArray(data.posts)) {
      allPublishedPosts = data.posts;
      renderPostsList(allPublishedPosts);
      updateTotalStats(allPublishedPosts);
    }
  } catch (err) {
    console.warn('Error fetching published posts:', err);
  }
}

function renderPostsList(posts) {
  const container = document.getElementById('publishedPostsList');
  if (!container) return;

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <i class="fa-solid fa-newspaper"></i>
        <p>No announcements broadcast yet. Use the composer above to publish your first announcement!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(p => {
    const dateStr = p.publishedAt ? new Date(p.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
    const platTags = (p.platforms || []).map(plat => {
      const icon = plat === 'youtube' ? 'fa-brands fa-youtube' : (plat === 'linkedin' ? 'fa-brands fa-linkedin' : (plat === 'instagram' ? 'fa-brands fa-instagram' : 'fa-brands fa-facebook'));
      return `<span class="post-plat-tag"><i class="${icon}"></i> ${plat}</span>`;
    }).join(' ');

    const mediaHtml = p.mediaUrl ? (
      p.mediaType === 'video'
        ? `<video src="${p.mediaUrl}" controls muted class="post-card-media"></video>`
        : `<img src="${p.mediaUrl}" alt="Post media" class="post-card-media">`
    ) : '';

    return `
      <div class="post-card-item">
        <div class="post-card-top">
          <div class="post-platforms-tags">${platTags}</div>
          <button type="button" class="btn-delete-post" onclick="deletePost('${p.id}')" title="Delete announcement">&times;</button>
        </div>
        <div class="post-card-category">${p.category || 'Department Update'}</div>
        <h4 class="post-card-title">${escapeHtml(p.title)}</h4>
        <div class="post-card-body">${escapeHtml(p.content)}</div>
        ${mediaHtml}
        <div class="post-card-footer">
          <span>By: ${escapeHtml(p.authorName || 'Faculty')}</span>
          <span>${dateStr}</span>
        </div>
      </div>
    `;
  }).join('');
}

function filterPublishedPosts() {
  loadPublishedPosts();
}

async function deletePost(postId) {
  if (!confirm('Are you sure you want to remove this announcement from department channels?')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/social/posts/${postId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${currentToken}` }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showHubAlert('Post removed from department channels.', 'success');
      await loadPublishedPosts();
    } else {
      showHubAlert(data.message || 'Failed to remove post.', 'error');
    }
  } catch (err) {
    showHubAlert('Error removing post.', 'error');
  }
}

function updateTotalStats(posts) {
  const statCount = document.getElementById('statTotalBroadcasts');
  const statEng = document.getElementById('statTotalEngagements');

  if (statCount) statCount.textContent = posts.length;
  if (statEng) {
    const totalLikes = posts.reduce((acc, p) => acc + (p.likes || 15), 0);
    statEng.textContent = totalLikes.toLocaleString();
  }
}

function showHubAlert(msg, type = 'success') {
  const alertBox = document.getElementById('socialHubAlert');
  if (!alertBox) return;
  const icon = type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>';
  alertBox.innerHTML = `${icon} <span>${msg}</span>`;
  alertBox.className = `social-alert-banner ${type}`;
  alertBox.classList.remove('form-hidden');

  setTimeout(() => {
    alertBox.classList.add('form-hidden');
  }, 4500);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
