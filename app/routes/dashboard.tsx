import { Outlet, useLoaderData } from 'react-router';

import { Route } from '@react-router-route-types/dashboard';

import i18n from '~/lib/i18next.server';
import { validateSession } from '~/lib/session.server';

import { SidebarProvider, SidebarTrigger } from '~/components/ui/sidebar';
import { AppSidebar } from '~/components/sidebar/AppSidebar';
import { Separator } from '~/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '~/components/ui/breadcrumb';

export const meta = ({ data }: Route.MetaArgs) => {
  return [
    { title: data.title },
    { name: 'description', content: data.description },
  ];
};

export const loader = async (args: Route.LoaderArgs) => {
  await validateSession(args);
  const { request, context } = args;

  const locale = await i18n.getLocale(request);
  const t = await i18n.getFixedT(request);

  return {
    user: context.user,
    locale,
    title: `${t('dashboard')} - ${t('title')}`,
    description: t('description'),
  };
};

export default function Dashboard() {
  const { locale, user } = useLoaderData<typeof loader>();

  return (
    <SidebarProvider>
      <AppSidebar locale={locale} user={user} />
      <main>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                {/* <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    Building Your Application
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" /> */}
                <BreadcrumbItem>
                  <BreadcrumbPage>Dashboard</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
