# Dashboard Structure - Admin vs Captain Views

## 🎯 **Overview**

The application now has separate dashboards for different user roles:

- **Admin Users**: Access to user management dashboard
- **Captain Users**: Access to shows/coaching management dashboard
- **Member Users**: Access to team dashboard only

## 📁 **File Structure**

### **Views**
- **`src/views/CaptainDashboardView.vue`** - Captain functionality (shows/coaching management)
- **`src/views/AdminUserManagementView.vue`** - Admin functionality (user management)
- **`src/views/TeamDashboardView.vue`** - Member functionality (view events)

### **Routing**
- **`/admin`** → `AdminUserManagementView.vue` (Admin users only)
- **`/captain`** → `CaptainDashboardView.vue` (Captain users only)
- **`/dashboard`** → `TeamDashboardView.vue` (All authenticated users)

## 🔐 **Access Control**

### **Admin Users (`role === 'admin'`)**
- ✅ **Navigation**: See "🛠️ Admin" button
- ✅ **Route Access**: Can access `/admin`
- ✅ **Functionality**: 
  - View all users
  - Update user roles
  - Assign teams
  - Toggle captain status
  - Delete users

### **Captain Users (`role === 'captain'`)**
- ✅ **Navigation**: See "⚡ Captain" button
- ✅ **Route Access**: Can access `/captain`
- ✅ **Functionality**:
  - Create coaching sessions
  - Manage attendance
  - Create shows
  - Add show dates
  - Manage availability

### **Member Users (`role === 'member'`)**
- ❌ **Navigation**: No admin/captain buttons
- ❌ **Route Access**: Cannot access `/admin` or `/captain`
- ✅ **Functionality**: View team dashboard only

## 🚀 **Navigation Flow**

### **Login Redirects**
```typescript
// After login, users are redirected based on role:
if (userStore.isAdmin) {
  next('/admin')        // Admin users → Admin dashboard
} else if (userStore.isCaptain) {
  next('/captain')      // Captain users → Captain dashboard
} else {
  next('/dashboard')    // Member users → Team dashboard
}
```

### **Navigation Buttons**
```vue
<!-- Admin users see this button -->
<router-link v-if="userStore.isAdmin" to="/admin">
  🛠️ Admin
</router-link>

<!-- Captain users see this button -->
<router-link v-if="userStore.isCaptain" to="/captain">
  ⚡ Captain
</router-link>
```

## 🔒 **Security**

### **Route Protection**
- **`/admin`**: Requires `requiresAdmin: true` → Only admin users
- **`/captain`**: Requires `requiresCaptain: true` → Only captain users
- **`/dashboard`**: Requires `requiresAuth: true` → All authenticated users

### **Authorization Checks**
```typescript
// Admin route protection
if (to.meta.requiresAdmin && !userStore.isAdmin) {
  next('/dashboard')  // Redirect non-admin users
}

// Captain route protection
if (to.meta.requiresCaptain && !userStore.isCaptain) {
  next('/dashboard')  // Redirect non-captain users
}
```

## 🎨 **UI Design**

### **Button Colors**
- **Admin Button**: Red (`#e74c3c`) - Indicates high-level access
- **Captain Button**: Orange (`#f39c12`) - Indicates team management
- **Logout Button**: Gray (`#95a5a6`) - Neutral action

### **Button Visibility**
- Buttons only show when user has appropriate role
- Buttons hide when user is already on that page
- Responsive design for mobile devices

## 📊 **User Experience**

### **Admin Users**
1. Login → Redirected to `/admin`
2. See "🛠️ Admin" button in navigation
3. Can manage all users and system settings
4. Cannot access captain functionality

### **Captain Users**
1. Login → Redirected to `/captain`
2. See "⚡ Captain" button in navigation
3. Can manage shows and coaching for their team
4. Cannot access admin functionality

### **Member Users**
1. Login → Redirected to `/dashboard`
2. No admin/captain buttons visible
3. Can only view team events and update personal status
4. Cannot access any management functionality

## 🔧 **Technical Implementation**

### **Router Configuration**
```typescript
{
  path: '/admin',
  name: 'admin',
  component: AdminUserManagementView,
  meta: { requiresAuth: true, requiresAdmin: true }
},
{
  path: '/captain',
  name: 'captain',
  component: CaptainDashboardView,
  meta: { requiresAuth: true, requiresCaptain: true }
}
```

### **Navigation Component**
```vue
<template>
  <nav v-if="userStore.isAuthenticated">
    <!-- Admin button for admin users -->
    <router-link v-if="userStore.isAdmin" to="/admin">
      🛠️ Admin
    </router-link>
    
    <!-- Captain button for captain users -->
    <router-link v-if="userStore.isCaptain" to="/captain">
      ⚡ Captain
    </router-link>
  </nav>
</template>
```

## ✅ **Benefits**

### **Security**
- ✅ **Role-based access**: Users only see what they can access
- ✅ **Route protection**: Server-side and client-side protection
- ✅ **Clear separation**: Admin and captain functions are separate

### **User Experience**
- ✅ **Clear navigation**: Users know exactly what they can do
- ✅ **Appropriate redirects**: Users go to the right place after login
- ✅ **Visual distinction**: Different colored buttons for different roles

### **Maintainability**
- ✅ **Separate concerns**: Admin and captain functionality are separate
- ✅ **Easy to extend**: Can add new roles easily
- ✅ **Clear structure**: Easy to understand and modify

## 🎉 **Summary**

The application now has a clean, secure, and user-friendly structure:

- **Admin users** get full user management capabilities
- **Captain users** get team-specific management capabilities  
- **Member users** get basic team dashboard access
- **Clear navigation** and **proper security** for all user types

Each user type has exactly the functionality they need, nothing more and nothing less! 🚀✨
