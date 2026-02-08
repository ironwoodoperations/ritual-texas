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
import AdminCloudbeds from './pages/AdminCloudbeds';
import AdminDashboard from './pages/AdminDashboard';
import AdminImages from './pages/AdminImages';
import AdminKnowledge from './pages/AdminKnowledge';
import AdminMedia from './pages/AdminMedia';
import AdminRestaurant from './pages/AdminRestaurant';
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
import Restaurant from './pages/Restaurant';
import RestaurantContact from './pages/RestaurantContact';
import RestaurantEvents from './pages/RestaurantEvents';
import RestaurantMenu from './pages/RestaurantMenu';
import RestaurantOrder from './pages/RestaurantOrder';
import RestaurantReservations from './pages/RestaurantReservations';
import Rooms from './pages/Rooms';
import StaffDashboard from './pages/StaffDashboard';
import afterBooking from './pages/afterBooking';
import booking from './pages/booking';
import concierge from './pages/concierge';
import itinerary from './pages/itinerary';
import Treatments from './pages/Treatments';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminBookings": AdminBookings,
    "AdminCloudbeds": AdminCloudbeds,
    "AdminDashboard": AdminDashboard,
    "AdminImages": AdminImages,
    "AdminKnowledge": AdminKnowledge,
    "AdminMedia": AdminMedia,
    "AdminRestaurant": AdminRestaurant,
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
    "Restaurant": Restaurant,
    "RestaurantContact": RestaurantContact,
    "RestaurantEvents": RestaurantEvents,
    "RestaurantMenu": RestaurantMenu,
    "RestaurantOrder": RestaurantOrder,
    "RestaurantReservations": RestaurantReservations,
    "Rooms": Rooms,
    "StaffDashboard": StaffDashboard,
    "afterBooking": afterBooking,
    "booking": booking,
    "concierge": concierge,
    "itinerary": itinerary,
    "Treatments": Treatments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};