# HomeManager - Property Management System

## Overview

HomeManager is a comprehensive web-based property management application designed for property managers, landlords, and property owners. It provides a complete solution for managing properties, units, tenants, leases, maintenance requests, and financial tracking—all running entirely in the browser with zero backend requirements.

## Key Features

### 🏢 Property Management
- **Multi-property support** - Manage unlimited properties in your portfolio
- **Hierarchical structure** - Properties contain Units, Units contain Tenants/Leases/Maintenance
- **Property details** - Track name, address, type, and unit count
- **Easy navigation** - Nested sidebar navigation showing all properties and units

### 🏠 Unit Management
- **Detailed unit tracking** - Label, square footage, rent amount, status
- **Status tracking** - Vacant, Occupied, or custom statuses
- **Unit-level tabs** - Dedicated sections for Tenants, Leases, Maintenance, and Features
- **Feature tracking** - Document appliances, systems, and equipment per unit

### 👥 Tenant Management
- **Tenant profiles** - Name, email, phone for each tenant
- **Unit assignment** - Link tenants to specific units
- **Lease association** - Create formal leases linking tenants to units

### 📄 Lease Management
- **Complete lease workflow** - Start date, end date, rent amount, security deposit
- **Active/inactive tracking** - End leases when tenants move out
- **Automatic payment generation** - Creates monthly payment records for lease duration
- **Lease expiration alerts** - Dashboard shows leases expiring soon

### 💰 Payment Tracking
- **Monthly rent tracking** - Automatically generated from leases
- **Payment status** - Mark payments as Paid or Unpaid
- **Financial dashboard** - View collected vs outstanding rent
- **Payment history** - Track all payments per lease

### 🔧 Maintenance Management
- **Request tracking** - Open, In Progress, Complete statuses
- **Feature linking** - Connect maintenance to specific appliances/systems
- **Vendor assignment** - Assign maintenance to preferred vendors
- **Maintenance history** - Completed requests with cost tracking
- **Cost tracking** - Record expenses for completed work

### 📋 Preventive Maintenance
- **Scheduled tasks** - Set up recurring maintenance (monthly, quarterly, etc.)
- **Property or Unit scope** - Tasks can apply to entire property or specific units
- **Vendor assignment** - Pre-assign vendors to preventive tasks
- **Due date tracking** - Visual indicators for upcoming tasks

### 🏪 Vendor Management
- **Vendor directory** - Name, category, phone, email
- **Categorization** - HVAC, Plumbing, Electrical, etc.
- **Quick assignment** - Assign to maintenance requests and preventive tasks

### 📊 Reports & Analytics
- **Financial summary** - Monthly revenue, collected rent, outstanding payments
- **Occupancy metrics** - Track occupancy rates per property
- **Maintenance costs** - Total maintenance expenses
- **Portfolio overview** - Complete snapshot of your properties

### 🔔 Notifications
- **Activity alerts** - New maintenance requests, lease expirations, rent status
- **Notification center** - View all alerts in one place
- **Clear functionality** - Remove old notifications

### 👤 User Management
- **Role-based access** - Property Manager, Landlord, or Tenant roles
- **User profiles** - Company name, phone, portfolio name
- **Onboarding flow** - Required profile setup for new users
- **Demo account** - Pre-configured demo user for testing

## Technology Stack

### Frontend
- **Pure JavaScript** - No frameworks, vanilla JS for maximum performance
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with custom properties and gradients
- **localStorage API** - All data persisted in browser

### Architecture
- **Zero dependencies** - No npm packages, no build process
- **Client-side only** - Runs entirely in the browser
- **Modular structure** - Separate files for auth, data, and UI
- **Single-page application** - Hash-based routing

## File Structure

```
homemanager/
├── index.html          # Login page
├── signup.html         # Registration page
├── forgot.html         # Password reset request
├── reset.html          # Password reset form
├── app.html            # Main application shell
├── styles.css          # Complete styling
├── auth.js             # Authentication logic
├── data.js             # Data layer & localStorage
└── app.js              # Main application logic & UI
```

## Getting Started

### Installation

1. **No installation required!** This is a pure client-side application.
2. Simply open `index.html` in any modern web browser.
3. All files must be in the same directory.

### First-Time Setup

1. **Use Demo Account** (Recommended)
   - Click "Use demo user" on the login page
   - Email: `demo@homemanager.com`
   - Password: `password`
   - Pre-loaded with sample data

2. **Create New Account**
   - Click "Create an account"
   - Fill in your details
   - Complete the onboarding profile
   - Start adding properties!

## Data Architecture

### Hierarchical Structure

```
Properties (Top Level)
└── Units (Child of Property)
    ├── Tenants (Child of Unit)
    ├── Leases (Child of Unit, links to Tenant)
    │   └── Payments (Child of Lease)
    ├── Maintenance (Child of Unit)
    │   └── Maintenance History (Completed maintenance)
    └── Features (Child of Unit)

Standalone Entities:
- Vendors (Referenced by Maintenance)
- Preventive Tasks (Property or Unit scoped)
- Notifications (System-wide)
- User Profiles (Per email)
```

### Data Storage

All data is stored in `localStorage` under two keys:

- `hm_users_v1` - User accounts and credentials
- `hm_data_v1` - All property, tenant, lease, and maintenance data

**Important:** Data is stored locally in your browser. Clearing browser data will delete all information.

## User Guide

### Dashboard

The dashboard provides an at-a-glance view of your portfolio:

- **Portfolio Summary** - Properties, units, monthly revenue, active maintenance
- **Rent Status** - Current month's rent collection status
- **Expiring Leases** - Leases ending soon
- **Recent Notifications** - Latest system alerts

### Managing Properties

1. Navigate to **Properties** page
2. Use "Add New Property" form:
   - Enter property name
   - Full address
   - Property type
3. Add units using "Add Unit to Property" form:
   - Select property
   - Unit label (e.g., "201" or "Unit A")
   - Square footage
   - Monthly rent

### Managing Tenants & Leases

1. Navigate to a Unit by:
   - Clicking unit in sidebar, OR
   - Clicking "Open" on Properties page

2. **Add Tenants** (Tenants tab):
   - Enter name, email, phone
   - Tenant is now associated with unit

3. **Create Lease** (Leases tab):
   - Select tenant from dropdown
   - Enter start and end dates
   - Enter monthly rent and deposit
   - Creating lease automatically:
     - Marks unit as "Occupied"
     - Generates monthly payment records
     - Updates unit with tenant name

4. **Track Payments** (Leases tab):
   - View all payment records
   - Toggle payment status (Paid/Unpaid)
   - Track payment history

### Managing Maintenance

1. Navigate to Unit → Maintenance tab

2. **Create Request**:
   - Describe the issue
   - Select category
   - Optionally link to a feature

3. **Advance Status**:
   - Open → In Progress → Complete
   - When marking Complete, enter cost
   - Request moves to Maintenance History

4. **Add Features** (Features tab):
   - Document appliances and systems
   - Link them to maintenance requests
   - Track what needs servicing

### Vendors

1. Navigate to **Vendors** page
2. Add vendors with:
   - Name
   - Category (HVAC, Plumbing, etc.)
   - Contact information
3. Assign to maintenance requests

### Preventive Maintenance

1. Navigate to **Preventive Maintenance** page
2. Schedule recurring tasks:
   - Choose Property or Unit scope
   - Task description
   - Frequency (Monthly, Quarterly, etc.)
   - Next due date
   - Optional vendor assignment
3. Track upcoming tasks sorted by due date

### Reports

View comprehensive analytics:
- Financial summary
- Occupancy by property
- Maintenance costs
- Portfolio metrics

## Tips & Best Practices

### Workflow Recommendations

1. **Start with Properties** - Add all properties first
2. **Add Units** - Create units under each property
3. **Add Tenants** - Enter tenant information
4. **Create Leases** - Formalize tenant-unit relationships
5. **Track Maintenance** - Log issues as they arise
6. **Schedule Preventive** - Set up recurring maintenance tasks

### Data Management

- **Delete Rules**:
  - Cannot delete property with units
  - Cannot delete unit with active lease
  - End lease before marking unit vacant

- **Payment Tracking**:
  - Payments auto-generate when lease is created
  - Mark payments as they're received
  - Outstanding payments show in dashboard

- **Maintenance Workflow**:
  - Create request when issue reported
  - Mark "In Progress" when work starts
  - Mark "Complete" when finished (enter cost)
  - Completed work moves to history

### Navigation

- **Sidebar** - Nested navigation showing all properties/units
- **Top Nav** - Main sections (Dashboard, Properties, etc.)
- **Hash URLs** - Bookmarkable (e.g., `#unit?unitId=u1&tab=tenants`)
- **Breadcrumbs** - Always know where you are

## Browser Compatibility

### Fully Supported
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Requirements
- JavaScript enabled
- localStorage enabled (for data persistence)
- Modern CSS support (CSS Grid, Flexbox, Custom Properties)

## Limitations & Future Enhancements

### Current Limitations

1. **No Backend** - Data stored only in browser
2. **Single User** - No multi-user collaboration
3. **No File Uploads** - Cannot store documents/images
4. **No Email/SMS** - No automated notifications
5. **No Export** - Cannot export data to CSV/PDF
6. **No Real Payments** - Payment tracking only, no processing

### Planned Features

- 🔄 Cloud backup and sync
- 👥 Multi-user access with permissions
- 📎 Document storage and e-signatures
- 📧 Email/SMS notifications
- 💳 Stripe integration for rent collection
- 📊 Advanced reporting and analytics
- 📱 Mobile apps (iOS/Android)
- 🔗 QuickBooks integration
- 🌐 Tenant portal
- 📥 Data export (CSV, PDF)

## Troubleshooting

### Data Not Persisting
- Ensure localStorage is enabled in browser settings
- Check if in Private/Incognito mode (data clears on close)
- Verify browser allows localStorage for file:// URLs

### Cannot Login
- Check credentials (email is case-insensitive)
- Use demo account: `demo@homemanager.com` / `password`
- Clear localStorage and re-register if needed

### Missing Features
- Ensure all files are in same directory
- Check browser console for JavaScript errors
- Try hard refresh (Ctrl+F5 / Cmd+Shift+R)

### Performance Issues
- Large datasets (1000+ units) may slow down
- Consider clearing old data periodically
- Use modern browser for best performance

## Security Notes

⚠️ **This is a prototype application**

- Passwords stored in plain text (localStorage)
- No encryption for sensitive data
- Not suitable for production use with real tenant data
- All data accessible via browser dev tools

**For production use, implement:**
- Server-side authentication
- Encrypted data storage
- HTTPS connections
- Proper access controls
- Regular backups

## Development

### Code Structure

**auth.js** - Authentication
- User registration
- Login/logout
- Password reset
- Demo user creation

**data.js** - Data Layer
- localStorage wrapper
- CRUD operations
- Data bootstrap
- Profile management

**app.js** - Application Logic
- Routing and navigation
- View rendering
- Event handling
- Business logic

**styles.css** - Styling
- Dark theme with gradients
- Responsive layout
- Component styles
- Utility classes

### Modifying the Code

The code is designed to be readable and modifiable:

1. **Add new fields** - Update data.js bootstrap and relevant views
2. **New features** - Add to getRoutesForRole() and create view function
3. **Styling** - Modify CSS custom properties in :root
4. **Data structure** - Update data.js schema

## License

This is a prototype/demonstration project. Feel free to use, modify, and distribute as needed.

## Support

For questions, issues, or feature requests:
- Review the code comments
- Check browser console for errors
- Verify all files are present

## Credits

Built with vanilla JavaScript, HTML5, and CSS3. No external libraries or frameworks.

---

**Version:** 1.0 (Prototype)  
**Last Updated:** February 2026  
**Author:** Property Management Solutions

