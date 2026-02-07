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
import AdminDashboard from './pages/AdminDashboard';
import AdminImages from './pages/AdminImages';
import AdminKnowledge from './pages/AdminKnowledge';
import AdminMedia from './pages/AdminMedia';
import AdminRooms from './pages/AdminRooms';
import AdminSeedData from './pages/AdminSeedData';
import AdminTreatmentBookings from './pages/AdminTreatmentBookings';
import AdminTreatments from './pages/AdminTreatments';
import Amenities from './pages/Amenities';
import AskRitual from './pages/AskRitual';
import BookRooms from './pages/BookRooms';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingFlow from './pages/BookingFlow';
import Home from './pages/Home';
import MyBooking from './pages/MyBooking';
import Press from './pages/Press';
import Rooms from './pages/Rooms';
import StaffDashboard from './pages/StaffDashboard';
import Treatments from './pages/Treatments';
import afterBooking from './pages/afterBooking';
import booking from './pages/booking';
import concierge from './pages/concierge';
import itinerary from './pages/itinerary';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminBookings": AdminBookings,
    "AdminDashboard": AdminDashboard,
    "AdminImages": AdminImages,
    "AdminKnowledge": AdminKnowledge,
    "AdminMedia": AdminMedia,
    "AdminRooms": AdminRooms,
    "AdminSeedData": AdminSeedData,
    "AdminTreatmentBookings": AdminTreatmentBookings,
    "AdminTreatments": AdminTreatments,
    "Amenities": Amenities,
    "AskRitual": AskRitual,
    "BookRooms": BookRooms,
    "BookingConfirmation": BookingConfirmation,
    "BookingFlow": BookingFlow,
    "Home": Home,
    "MyBooking": MyBooking,
    "Press": Press,
    "Rooms": Rooms,
    "StaffDashboard": StaffDashboard,
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