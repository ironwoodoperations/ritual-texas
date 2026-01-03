import AdminBookings from './pages/AdminBookings';
import AdminDashboard from './pages/AdminDashboard';
import AdminKnowledge from './pages/AdminKnowledge';
import AdminPackages from './pages/AdminPackages';
import AdminRooms from './pages/AdminRooms';
import AdminSeedData from './pages/AdminSeedData';
import AdminTreatments from './pages/AdminTreatments';
import AskRitual from './pages/AskRitual';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingFlow from './pages/BookingFlow';
import Home from './pages/Home';
import MyBooking from './pages/MyBooking';
import Packages from './pages/Packages';
import Rooms from './pages/Rooms';
import StaffDashboard from './pages/StaffDashboard';
import Treatments from './pages/Treatments';
import AdminImages from './pages/AdminImages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminBookings": AdminBookings,
    "AdminDashboard": AdminDashboard,
    "AdminKnowledge": AdminKnowledge,
    "AdminPackages": AdminPackages,
    "AdminRooms": AdminRooms,
    "AdminSeedData": AdminSeedData,
    "AdminTreatments": AdminTreatments,
    "AskRitual": AskRitual,
    "BookingConfirmation": BookingConfirmation,
    "BookingFlow": BookingFlow,
    "Home": Home,
    "MyBooking": MyBooking,
    "Packages": Packages,
    "Rooms": Rooms,
    "StaffDashboard": StaffDashboard,
    "Treatments": Treatments,
    "AdminImages": AdminImages,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};