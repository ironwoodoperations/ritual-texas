/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import About from './pages/About';
import AdminBookings from './pages/AdminBookings';
import AdminCatering from './pages/AdminCatering';
import AdminCateringMenu from './pages/AdminCateringMenu';
import AdminCateringQuote from './pages/AdminCateringQuote';
import AdminCloudbeds from './pages/AdminCloudbeds';
import AdminConciergeInbox from './pages/AdminConciergeInbox';
import AdminDashboard from './pages/AdminDashboard';
import AdminHousekeeping from './pages/AdminHousekeeping';
import AdminHousekeepingIssues from './pages/AdminHousekeepingIssues';
import AdminHousekeepingSetup from './pages/AdminHousekeepingSetup';
import AdminHousekeepingTask from './pages/AdminHousekeepingTask';
import AdminImages from './pages/AdminImages';
import AdminIntake from './pages/AdminIntake';
import AdminKnowledge from './pages/AdminKnowledge';
import AdminMedia from './pages/AdminMedia';
import AdminPackageInquiries from './pages/AdminPackageInquiries';
import AdminPackages from './pages/AdminPackages';
import AdminRestaurant from './pages/AdminRestaurant';
import AdminRestaurantSales from './pages/AdminRestaurantSales';
import AdminRooms from './pages/AdminRooms';
import AdminSeedData from './pages/AdminSeedData';
import AdminSpaSchedule from './pages/AdminSpaSchedule';
import AdminSquareBackup from './pages/AdminSquareBackup';
import AdminTreatments from './pages/AdminTreatments';
import Amenities from './pages/Amenities';
import AskRitual from './pages/AskRitual';
import BookRooms from './pages/BookRooms';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingFlow from './pages/BookingFlow';
import Home from './pages/Home';
import Hotel from './pages/Hotel';
import MyBooking from './pages/MyBooking';
import PackageDetail from './pages/PackageDetail';
import Packages from './pages/Packages';
import Press from './pages/Press';
import Restaurant from './pages/Restaurant';
import RestaurantContact from './pages/RestaurantContact';
import RestaurantEvents from './pages/RestaurantEvents';
import RestaurantMenu from './pages/RestaurantMenu';
import RestaurantOrder from './pages/RestaurantOrder';
import RestaurantReservations from './pages/RestaurantReservations';
import Rooms from './pages/Rooms';
import StaffControls from './pages/StaffControls';
import StaffDashboard from './pages/StaffDashboard';
import StaffLogin from './pages/StaffLogin';
import Treatments from './pages/Treatments';
import afterBooking from './pages/afterBooking';
import booking from './pages/booking';
import concierge from './pages/concierge';
import itinerary from './pages/itinerary';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminBookings": AdminBookings,
    "AdminCatering": AdminCatering,
    "AdminCateringMenu": AdminCateringMenu,
    "AdminCateringQuote": AdminCateringQuote,
    "AdminCloudbeds": AdminCloudbeds,
    "AdminConciergeInbox": AdminConciergeInbox,
    "AdminDashboard": AdminDashboard,
    "AdminHousekeeping": AdminHousekeeping,
    "AdminHousekeepingIssues": AdminHousekeepingIssues,
    "AdminHousekeepingSetup": AdminHousekeepingSetup,
    "AdminHousekeepingTask": AdminHousekeepingTask,
    "AdminImages": AdminImages,
    "AdminIntake": AdminIntake,
    "AdminKnowledge": AdminKnowledge,
    "AdminMedia": AdminMedia,
    "AdminPackageInquiries": AdminPackageInquiries,
    "AdminPackages": AdminPackages,
    "AdminRestaurant": AdminRestaurant,
    "AdminRestaurantSales": AdminRestaurantSales,
    "AdminRooms": AdminRooms,
    "AdminSeedData": AdminSeedData,
    "AdminSpaSchedule": AdminSpaSchedule,
    "AdminSquareBackup": AdminSquareBackup,
    "AdminTreatments": AdminTreatments,
    "Amenities": Amenities,
    "AskRitual": AskRitual,
    "BookRooms": BookRooms,
    "BookingConfirmation": BookingConfirmation,
    "BookingFlow": BookingFlow,
    "Home": Home,
    "Hotel": Hotel,
    "MyBooking": MyBooking,
    "PackageDetail": PackageDetail,
    "Packages": Packages,
    "Press": Press,
    "Restaurant": Restaurant,
    "RestaurantContact": RestaurantContact,
    "RestaurantEvents": RestaurantEvents,
    "RestaurantMenu": RestaurantMenu,
    "RestaurantOrder": RestaurantOrder,
    "RestaurantReservations": RestaurantReservations,
    "Rooms": Rooms,
    "StaffControls": StaffControls,
    "StaffDashboard": StaffDashboard,
    "StaffLogin": StaffLogin,
    "Treatments": Treatments,
    "afterBooking": afterBooking,
    "booking": booking,
    "concierge": concierge,
    "itinerary": itinerary,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};