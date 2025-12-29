import Home from './pages/Home';
import Rooms from './pages/Rooms';
import Treatments from './pages/Treatments';
import Packages from './pages/Packages';
import BookingFlow from './pages/BookingFlow';
import BookingConfirmation from './pages/BookingConfirmation';
import MyBooking from './pages/MyBooking';
import AskRitual from './pages/AskRitual';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Rooms": Rooms,
    "Treatments": Treatments,
    "Packages": Packages,
    "BookingFlow": BookingFlow,
    "BookingConfirmation": BookingConfirmation,
    "MyBooking": MyBooking,
    "AskRitual": AskRitual,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};