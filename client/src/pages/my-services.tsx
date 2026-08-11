import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { Search, UserPlus, UserMinus, Calendar, MapPin, DollarSign, Package } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { GET_PARTNER_SERVICES, GET_USER_PARTNER_SERVICES, GET_USER_SUBSCRIPTIONS, SUBSCRIBE_TO_SERVICE, UNSUBSCRIBE_FROM_SERVICE } from "@/graphql/partners";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Partner {
  id: string;
  name: string;
  type: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  description?: string;
  status: string;
}

interface Service {
  id: string;
  name: string;
  description?: string;
  partner: Partner;
  category: string;
  serviceType: string;
  price: number;
  currency: string;
  billingCycle: string;
  status: string;
}

interface Subscription {
  id: string;
  userId: string;
  partnerServiceId: string;
  associationContext: {
    endDate: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserPartnerService {
  subscription: Subscription;
  service: Service;
}

interface PartnerService {
  id: string;
  name: string;
  description?: string;
  partner: {
    id: string;
    name: string;
  };
  category: string;
  price: number;
  currency: string;
  billingCycle: string;
  serviceType: string;
  status: string;
}

interface UserSubscription {
  isActive: boolean;
  partnerServiceId: string;
}

export default function MyServices() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Track page view
  useEffect(() => {
    trackPage('My Services', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.SERVICE_VIEWED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);

  // Query for subscribed services (cards at top)
  const { loading: loadingSubscribed, error: errorSubscribed, data: subscribedData, refetch: refetchUserServices } = useQuery(GET_USER_PARTNER_SERVICES, {
    variables: { email: user?.email || "" },
    skip: !user?.email,
  });

  // Query for all partner services (table below)
  const { loading, error, data } = useQuery(GET_PARTNER_SERVICES);

  const { data: subscriptionsData, refetch: refetchSubscriptions } = useQuery(GET_USER_SUBSCRIPTIONS, {
    variables: { email: user?.email || "" },
    skip: !user?.email,
  });

  const userServices: UserPartnerService[] = (subscribedData as any)?.userPartnerServices || [];
  const userSubscriptions: UserSubscription[] = (subscriptionsData as any)?.userSubscriptions || [];

  const [subscribeToService, { loading: subscribing }] = useMutation(SUBSCRIBE_TO_SERVICE, {
    onCompleted: () => {
      toast({
        title: "Success",
        description: "Successfully subscribed to service!",
      });
      refetchSubscriptions();
      refetchUserServices();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to subscribe to service",
        variant: "destructive",
      });
    },
  });

  const [unsubscribeFromService, { loading: unsubscribing }] = useMutation(UNSUBSCRIBE_FROM_SERVICE, {
    onCompleted: (data: any) => {
      if (data?.unsubscribeFromService?.success) {
        toast({
          title: "Success",
          description: data.unsubscribeFromService.message || "Successfully unsubscribed from service!",
        });
        refetchSubscriptions();
        refetchUserServices();
      } else {
        toast({
          title: "Error",
          description: data?.unsubscribeFromService?.message || "Failed to unsubscribe",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unsubscribe from service",
        variant: "destructive",
      });
    },
  });

  const services: PartnerService[] = (data as any)?.partnerServices || [];

  // Filter to show only active services and apply search query
  const filteredServices = services.filter((service) => {
    const isActive = service.status?.toLowerCase() === "active";
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.partner?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    return isActive && matchesSearch;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category?.toUpperCase()) {
      case "FITNESS":
        return "bg-blue-100 text-blue-800";
      case "NUTRITION":
        return "bg-green-100 text-green-800";
      case "MENTAL_HEALTH":
        return "bg-purple-100 text-purple-800";
      case "DIAGNOSTICS":
        return "bg-orange-100 text-orange-800";
      case "TELEMEDICINE":
        return "bg-cyan-100 text-cyan-800";
      case "WELLNESS_COACHING":
        return "bg-pink-100 text-pink-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatBillingCycle = (cycle: string) => {
    switch (cycle?.toUpperCase()) {
      case "MONTHLY":
        return "Monthly";
      case "QUARTERLY":
        return "Quarterly";
      case "YEARLY":
        return "Yearly";
      case "ONE_TIME":
        return "One-time";
      default:
        return cycle;
    }
  };

  const isSubscribed = (serviceId: string): boolean => {
    return userSubscriptions.some(
      (sub) => sub.partnerServiceId === serviceId && sub.isActive
    );
  };

  const handleSubscribe = async (serviceId: string) => {
    if (!user?.email) return;

    // Set end date to 1 year from now
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    trackEvent(AnalyticsEvents.SERVICE_SUBSCRIBED, {
      serviceId,
      userId: user.email,
      timestamp: new Date().toISOString(),
    });

    await subscribeToService({
      variables: {
        email: user.email,
        serviceId: serviceId,
        endDate: endDate.toISOString(),
      },
    });
  };

  const handleUnsubscribe = async (serviceId: string) => {
    if (!user?.email) return;

    trackEvent(AnalyticsEvents.SERVICE_UNSUBSCRIBED, {
      serviceId,
      userId: user.email,
      timestamp: new Date().toISOString(),
    });

    await unsubscribeFromService({
      variables: {
        email: user.email,
        serviceId: serviceId,
      },
    });
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-8">
            <h1 className="text-xl font-semibold text-slate-900">My Services</h1>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8 space-y-8">
            {/* Subscribed Services Section - Cards at Top */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Your Subscribed Services
                </h2>
                <p className="text-slate-600">
                  Manage and view all your wellness service subscriptions
                </p>
              </div>

              {loadingSubscribed && (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading your subscriptions...</p>
                </div>
              )}
              
              {errorSubscribed && (
                <div className="text-center py-12">
                  <p className="text-red-600">Error: {errorSubscribed.message}</p>
                </div>
              )}
              
              {!loadingSubscribed && !errorSubscribed && userServices.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No Active Subscriptions
                  </h3>
                  <p className="text-slate-600 mb-6">
                    You haven't subscribed to any wellness services yet. Browse available services below.
                  </p>
                </div>
              )}
              
              {!loadingSubscribed && !errorSubscribed && userServices.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userServices.map(({ subscription, service }) => (
                    <Card key={subscription.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                          <Badge className={getStatusBadgeColor(service.status)}>
                            {service.status}
                          </Badge>
                        </div>
                        <CardDescription className="line-clamp-2">
                          {service.description || "No description available"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Partner Information */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-slate-900">Partner</h4>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-slate-600">
                              <p className="font-medium">{service.partner.name}</p>
                              {service.partner.city && service.partner.state && (
                                <p className="text-xs">
                                  {service.partner.city}, {service.partner.state}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Service Details */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Category</span>
                            <Badge className={getCategoryColor(service.category)}>
                              {service.category}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Type</span>
                            <span className="text-sm font-medium text-slate-900">
                              {service.serviceType}
                            </span>
                          </div>
                        </div>

                        {/* Pricing */}
                        <div className="pt-3 border-t border-slate-200">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="w-4 h-4 text-slate-400" />
                            <span className="text-lg font-bold text-slate-900">
                              {service.price} {service.currency}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            {formatBillingCycle(service.billingCycle)}
                          </p>
                        </div>

                        {/* Subscription Details */}
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <div className="text-xs text-slate-600">
                              <p>
                                <span className="font-medium">Subscribed:</span>{" "}
                                {format(new Date(subscription.createdAt), "MMM d, yyyy")}
                              </p>
                              <p>
                                <span className="font-medium">Valid until:</span>{" "}
                                {format(new Date(subscription.associationContext.endDate), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">Status</span>
                            <Badge
                              className={
                                subscription.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {subscription.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>

                        {/* Unsubscribe Button */}
                        {subscription.isActive && (
                          <div className="pt-3 border-t border-slate-200">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnsubscribe(service.id)}
                              disabled={unsubscribing}
                              className="w-full border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <UserMinus className="w-4 h-4 mr-2" />
                              {unsubscribing ? "Unsubscribing..." : "Unsubscribe"}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* All Available Services Section - Table Below */}
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Browse All Services
                </h2>
                <p className="text-slate-600">
                  Explore and subscribe to available wellness services
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex-1 max-w-md relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {loading && (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading services...</p>
                </div>
              )}
              
              {error && (
                <div className="text-center py-12">
                  <p className="text-red-600">Error: {error.message}</p>
                </div>
              )}
              
              {!loading && !error && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold text-slate-900">Service Name</TableHead>
                        <TableHead className="font-semibold text-slate-900">Partner Name</TableHead>
                        <TableHead className="font-semibold text-slate-900">Category</TableHead>
                        <TableHead className="font-semibold text-slate-900">Pricing</TableHead>
                        <TableHead className="font-semibold text-slate-900">Service Type</TableHead>
                        <TableHead className="font-semibold text-slate-900">Status</TableHead>
                        <TableHead className="font-semibold text-slate-900 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredServices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-slate-600">
                            No services found matching your criteria.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredServices.map((service) => (
                          <TableRow key={service.id} className="hover:bg-slate-50">
                            <TableCell className="font-medium text-slate-900">{service.name}</TableCell>
                            <TableCell className="text-slate-600">{service.partner?.name || 'N/A'}</TableCell>
                            <TableCell className="text-slate-600">{service.category}</TableCell>
                            <TableCell className="text-slate-600">
                              {service.price} {service.currency}, {service.billingCycle}
                            </TableCell>
                            <TableCell className="text-slate-600">{service.serviceType}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(service.status)}`}>
                                {service.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-2 justify-end">
                                {isSubscribed(service.id) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnsubscribe(service.id)}
                                    disabled={unsubscribing}
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    <UserMinus className="w-4 h-4 mr-1" />
                                    Unsubscribe
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSubscribe(service.id)}
                                    disabled={subscribing}
                                    className="border-green-300 text-green-600 hover:bg-green-50"
                                  >
                                    <UserPlus className="w-4 h-4 mr-1" />
                                    Subscribe
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Made with Bob