import React from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNavbar from '../components/DashboardNavbar';

const DashboardLayout = () => {
  return (
    <>
      <DashboardNavbar />
      <main className="p-6">
        <Outlet />
      </main>
    </>
  );
};

export default DashboardLayout;