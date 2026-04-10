import { redirect } from 'next/navigation';

const Home = () => {
    redirect('/app');
};

export { Home as default };
