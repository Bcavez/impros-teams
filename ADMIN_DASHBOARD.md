# Admin Dashboard Guide

## 🛠️ Admin Dashboard Features

The admin dashboard provides comprehensive user management capabilities for administrators.

### ✅ **What's Available:**

#### 1. **User Role Management**
- **Assign Roles**: Change user roles between Member, Captain, and Admin
- **Role Types**:
  - **Member**: Basic user with limited permissions
  - **Captain**: Team leader with captain privileges
  - **Admin**: Full system access and user management

#### 2. **Team Assignment**
- **Assign Teams**: Assign users to Samurai, Gladiator, or Viking teams
- **Remove from Team**: Set team to "No Team" to remove assignment
- **Team Options**:
  - Samurai
  - Gladiator
  - Viking
  - No Team (unassigned)

#### 3. **Captain Status Management**
- **Toggle Captain Status**: Enable/disable captain privileges for users
- **Automatic Role Sync**: Only users with "captain" role can be marked as captain
- **Team Leadership**: Captains can manage their team's activities

#### 4. **User Management**
- **View All Users**: Complete list of all registered users
- **Search & Filter**: Find users by name, email, role, or team
- **Delete Users**: Remove users from the system (with confirmation)
- **User Statistics**: Overview of total users, admins, captains, and members

## 🚀 **How to Access:**

### **For Admin Users:**
1. **Login** with admin credentials
2. **Look for the red "🛠️ Admin Dashboard" button** in the top-right corner
3. **Click the button** to access the admin dashboard
4. **Or navigate directly** to `/admin` URL

### **Access Requirements:**
- ✅ User must be logged in
- ✅ User must have "admin" role
- ✅ User must have proper permissions

## 📊 **Dashboard Features:**

### **Statistics Overview:**
- **Total Users**: Count of all registered users
- **Admins**: Number of admin users
- **Captains**: Number of captain users
- **Members**: Number of regular member users

### **User Table:**
- **Name**: User's full name
- **Email**: User's email address
- **Role**: Dropdown to change user role (Member/Captain/Admin)
- **Team**: Dropdown to assign team (Samurai/Gladiator/Viking/No Team)
- **Captain**: Checkbox to toggle captain status (only for captain role)
- **Created**: User registration date
- **Actions**: Delete user button

### **Search & Filter:**
- **Search Box**: Search by name or email
- **Role Filter**: Filter by specific roles
- **Team Filter**: Filter by specific teams
- **Combined Filters**: Use multiple filters together

## 🔧 **How to Use:**

### **Changing User Roles:**
1. Find the user in the table
2. Click the role dropdown in the "Role" column
3. Select new role (Member/Captain/Admin)
4. Changes are saved automatically
5. Success/error message will appear

### **Assigning Teams:**
1. Find the user in the table
2. Click the team dropdown in the "Team" column
3. Select team (Samurai/Gladiator/Viking) or "No Team"
4. Changes are saved automatically
5. Success/error message will appear

### **Managing Captain Status:**
1. Ensure user has "captain" role first
2. Check/uncheck the "Captain" checkbox
3. Changes are saved automatically
4. Success/error message will appear

### **Deleting Users:**
1. Click the 🗑️ delete button for the user
2. Confirm deletion in the popup dialog
3. User will be permanently removed
4. Success/error message will appear

## ⚠️ **Important Notes:**

### **Security Features:**
- **Self-Protection**: Admins cannot delete themselves
- **Role Protection**: Admins cannot change their own role
- **Confirmation Dialogs**: Delete actions require confirmation
- **Real-time Updates**: Changes are immediately reflected

### **Role Hierarchy:**
- **Admin**: Can manage all users and system settings
- **Captain**: Can manage team-specific activities
- **Member**: Basic user with limited permissions

### **Team Management:**
- Users can be assigned to one team at a time
- Users can be removed from teams (set to "No Team")
- Captain status is independent of team assignment

## 🎯 **Best Practices:**

### **Role Assignment:**
- Only assign "admin" role to trusted users
- Use "captain" role for team leaders
- Keep most users as "member" role

### **Team Organization:**
- Assign users to appropriate teams based on their role
- Ensure each team has at least one captain
- Keep team sizes balanced

### **User Management:**
- Regularly review user roles and permissions
- Remove inactive users promptly
- Monitor admin user count

## 🔍 **Troubleshooting:**

### **Common Issues:**
- **Can't access admin dashboard**: Ensure user has "admin" role
- **Changes not saving**: Check internet connection and try again
- **User not appearing**: Refresh the page or check filters
- **Permission errors**: Verify user has proper admin privileges

### **Error Messages:**
- **"Unauthorized"**: User doesn't have admin permissions
- **"Failed to update"**: Network or database error
- **"User not found"**: User may have been deleted by another admin

## 📱 **Mobile Support:**

The admin dashboard is fully responsive and works on:
- ✅ Desktop computers
- ✅ Tablets
- ✅ Mobile phones
- ✅ All modern browsers

## 🎉 **Summary:**

The admin dashboard provides powerful user management capabilities:
- ✅ **Role Management**: Assign and change user roles
- ✅ **Team Assignment**: Organize users into teams
- ✅ **Captain Management**: Control team leadership
- ✅ **User Administration**: Complete user lifecycle management
- ✅ **Search & Filter**: Easy user discovery and organization
- ✅ **Real-time Updates**: Immediate feedback and changes
- ✅ **Security**: Protected operations with confirmations

Your team management app now has a comprehensive admin interface! 🛠️✨
