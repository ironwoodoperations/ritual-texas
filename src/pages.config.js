import Home from './pages/Home';
import Rooms from './pages/Rooms';
import Treatments from './pages/Treatments';
import Packages from './pages/Packages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Rooms": Rooms,
    "Treatments": Treatments,
    "Packages": Packages,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};