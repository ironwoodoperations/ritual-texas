import About from './pages/About';
import AdminBookings from './pages/AdminBookings';
import AdminDashboard from './pages/AdminDashboard';
import AdminImages from './pages/AdminImages';
import AdminKnowledge from './pages/AdminKnowledge';
import AdminRooms from './pages/AdminRooms';
import AdminSeedData from './pages/AdminSeedData';
import AdminTreatments from './pages/AdminTreatments';
import Amenities from './pages/Amenities';
import AskRitual from './pages/AskRitual';
import BookRooms from './pages/BookRooms';
import BookingConfirmation from './pages/BookingConfirmation';
import BookingFlow from './pages/BookingFlow';
import Home from './pages/Home';
import MyBooking from './pages/MyBooking';
import Rooms from './pages/Rooms';
import StaffDashboard from './pages/StaffDashboard';
import AdminMedia from './pages/AdminMedia';
import Treatments from './pages/Treatments';
import TreatmentCheckout from './pages/TreatmentCheckout';
import __Layout from './Layout.jsx';


export const PAGES = {
    "About": About,
    "AdminBookings": AdminBookings,
    "AdminDashboard": AdminDashboard,
    "AdminImages": AdminImages,
    "AdminKnowledge": AdminKnowledge,
    "AdminRooms": AdminRooms,
    "AdminSeedData": AdminSeedData,
    "AdminTreatments": AdminTreatments,
    "Amenities": Amenities,
    "AskRitual": AskRitual,
    "BookRooms": BookRooms,
    "BookingConfirmation": BookingConfirmation,
    "BookingFlow": BookingFlow,
    "Home": Home,
    "MyBooking": MyBooking,
    "Rooms": Rooms,
    "StaffDashboard": StaffDashboard,
    "AdminMedia": AdminMedia,
    "Treatments": Treatments,
    "TreatmentCheckout": TreatmentCheckout,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};