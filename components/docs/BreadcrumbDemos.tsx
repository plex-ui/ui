'use client';

import { Breadcrumb } from '@plexui/ui/components/Breadcrumb';

export function BreadcrumbOverviewDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <Breadcrumb>
        <Breadcrumb.Item href="#">Home</Breadcrumb.Item>
        <Breadcrumb.Item href="#">Settings</Breadcrumb.Item>
        <Breadcrumb.Item current>Members</Breadcrumb.Item>
      </Breadcrumb>
    </div>
  );
}

export function BreadcrumbSizesDemo() {
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center gap-4 py-12 w-full">
      <Breadcrumb size="sm">
        <Breadcrumb.Item href="#">Projects</Breadcrumb.Item>
        <Breadcrumb.Item href="#">Website</Breadcrumb.Item>
        <Breadcrumb.Item current>Deployments</Breadcrumb.Item>
      </Breadcrumb>
      <Breadcrumb>
        <Breadcrumb.Item href="#">Projects</Breadcrumb.Item>
        <Breadcrumb.Item href="#">Website</Breadcrumb.Item>
        <Breadcrumb.Item current>Deployments</Breadcrumb.Item>
      </Breadcrumb>
    </div>
  );
}

export function BreadcrumbSeparatorDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <Breadcrumb separator="/">
        <Breadcrumb.Item href="#">acme</Breadcrumb.Item>
        <Breadcrumb.Item href="#">design-system</Breadcrumb.Item>
        <Breadcrumb.Item current>README.md</Breadcrumb.Item>
      </Breadcrumb>
    </div>
  );
}

export function BreadcrumbWrapDemo() {
  return (
    <div data-demo-stage className="flex-1 flex items-center justify-center py-12 w-full">
      <div className="w-[260px]">
        <Breadcrumb>
          <Breadcrumb.Item href="#">Workspace</Breadcrumb.Item>
          <Breadcrumb.Item href="#">Customer accounts</Breadcrumb.Item>
          <Breadcrumb.Item href="#">Northwind Traders</Breadcrumb.Item>
          <Breadcrumb.Item>Archived</Breadcrumb.Item>
          <Breadcrumb.Item current>Invoice 2024-0193</Breadcrumb.Item>
        </Breadcrumb>
      </div>
    </div>
  );
}
