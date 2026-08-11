import { useState, useEffect } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { Search, Plus, CheckCircle, XCircle, X } from "lucide-react";
import Sidebar from "@/components/sidebar";
import NotificationBell from "@/components/notification-bell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GET_PARTNER_SERVICES, GET_PARTNERS, ONBOARD_PARTNER_SERVICE, GET_SERVICE_REVIEW, EXECUTE_REVIEW_ACTION } from "@/graphql/partners";
import { useToast } from "@/hooks/use-toast";
import { trackPage, trackEvent, AnalyticsEvents } from "@/lib/analytics";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

interface ReviewAction {
  buttonName: string;
  type: string;
  webhookURL: string;
}

export default function PartnerServices() {
  const { user } = useAuth();
  const { alerts, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  // Track page view
  useEffect(() => {
    trackPage('Partner Services', {
      userId: user?.email,
    });
    trackEvent(AnalyticsEvents.PARTNER_SERVICE_VIEWED, {
      userId: user?.email,
      timestamp: new Date().toISOString(),
    });
  }, [user?.email]);
  const [isOnboardDialogOpen, setIsOnboardDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<PartnerService | null>(null);
  const [reviewActions, setReviewActions] = useState<ReviewAction[]>([]);
  const [reviewNotes, setReviewNotes] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    partnerId: "",
    category: "",
    price: "",
    currency: "",
    billingCycle: "",
    serviceType: "",
  });

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const categories = [
    { value: "FITNESS", label: "Fitness" },
    { value: "NUTRITION", label: "Nutrition" },
    { value: "MENTAL_HEALTH", label: "Mental Health" },
    { value: "DIAGNOSTICS", label: "Diagnostics" },
    { value: "TELEMEDICINE", label: "Telemedicine" },
    { value: "WELLNESS_COACHING", label: "Wellness Coaching" }
  ];

  const availableTags = [
    "hypertensive",
    "diabetic",
    "prediabetic",
    "obese",
    "sedentary",
    "active",
    "low blood pressure",
    "low oxygen saturation"
  ];

  const { loading, error, data } = useQuery(GET_PARTNER_SERVICES);

  const { data: partnersData } = useQuery(GET_PARTNERS, {
    variables: {
      searchQuery: null,
      type: null,
      location: null,
    },
  });

  const [onboardPartnerService, { loading: onboardLoading }] = useMutation(ONBOARD_PARTNER_SERVICE, {
    refetchQueries: [{ query: GET_PARTNER_SERVICES }],
    onCompleted: () => {
      toast({
        title: "Success",
        description: "Partner service onboarded successfully",
      });
      handleCloseDialogs();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const [getServiceReview, { loading: loadingReview }] = useLazyQuery(GET_SERVICE_REVIEW);

  const [executeReviewAction, { loading: executingAction }] = useMutation(EXECUTE_REVIEW_ACTION, {
    onCompleted: (data: any) => {
      if (data?.executeReviewAction?.success) {
        toast({
          title: "Success",
          description: data.executeReviewAction.message || "Action executed successfully!",
        });
        handleCloseDialogs();
      } else {
        toast({
          title: "Error",
          description: data?.executeReviewAction?.message || "Failed to execute action",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to execute action",
        variant: "destructive",
      });
    },
    refetchQueries: [{ query: GET_PARTNER_SERVICES }],
  });

  const services: PartnerService[] = (data as any)?.partnerServices || [];
  const partners = (partnersData as any)?.partners || [];

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.partner?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenOnboardDialog = () => {
    setFormData({ name: "", description: "", partnerId: "", category: "", price: "", currency: "USD", billingCycle: "MONTHLY", serviceType: "DIGITAL" });
    setSelectedTags([]);
    setIsOnboardDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsOnboardDialogOpen(false);
    setIsReviewDialogOpen(false);
    setSelectedService(null);
    setReviewActions([]);
    setReviewNotes("");
    setSelectedTags([]);
    setFormData({ name: "", description: "", partnerId: "", category: "", price: "", currency: "USD", billingCycle: "MONTHLY", serviceType: "DIGITAL" });
  };

  const handleSubmitOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate serviceCode: service name in caps with spaces replaced with hyphens
    const serviceCode = formData.name.toUpperCase().replace(/\s+/g, '-');
    
    try {
      await onboardPartnerService({
        variables: {
          input: {
            name: formData.name,
            description: formData.description,
            partnerId: formData.partnerId,
            category: formData.category,
            serviceType: formData.serviceType,
            amount: parseFloat(formData.price),
            currency: formData.currency,
            billingCycle: formData.billingCycle,
            pricingModel: "SUBSCRIPTION",
            serviceCode: serviceCode,
            tags: selectedTags,
          },
        },
      });
    } catch (error) {
      console.error("Error onboarding service:", error);
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : [...prev, tag]
    );
  };

  const handleRemoveTag = (tag: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleOpenReviewDialog = async (service: PartnerService) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      partnerId: service.partner?.id || "",
      category: service.category,
      price: service.price.toString(),
      currency: service.currency,
      billingCycle: service.billingCycle,
      serviceType: service.serviceType,
    });
    
    // Fetch review actions for this service
    try {
      const { data }: any = await getServiceReview({
        variables: { serviceId: service.id }
      });
      
      if (data?.getServiceReview?.review) {
        setReviewActions(Array.isArray(data.getServiceReview.review) ? data.getServiceReview.review : [data.getServiceReview.review]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch service review",
        variant: "destructive",
      });
    }
    
    setIsReviewDialogOpen(true);
  };

  const handleReviewAction = (action: ReviewAction) => {
    if (!selectedService || !user?.email) return;
    
    // Parse the webhook URL to extract userId and notes from query params
    const url = new URL(action.webhookURL);
    const urlUserId = url.searchParams.get('userId') || user.email;
    
    // Use the notes from the textarea or the default from action type
    const notes = reviewNotes || action.type.charAt(0).toUpperCase() + action.type.slice(1);
    
    executeReviewAction({
      variables: {
        webhookUrl: action.webhookURL,
        userId: urlUserId,
        notes: notes,
      },
    });
  };

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

  const getNextStatus = (currentStatus: string): string => {
    const statusLower = currentStatus?.toLowerCase();
    
    // If already approved, show "Approved"
    if (statusLower === "approved") {
      return "Approved";
    }
    
    // If rejected, show "Rejected"
    if (statusLower === "rejected") {
      return "Rejected";
    }
    
    const statusFlow: { [key: string]: string } = {
      "draft": "Pending Review",
      "pending": "Under Review",
      "under review": "Approved",
      "active": "Active",
    };
    return statusFlow[statusLower] || "Approve";
  };

  const canApprove = (status: string): boolean => {
    const statusLower = status?.toLowerCase();
    // Cannot approve if already active, approved, or rejected
    return statusLower !== "active" && statusLower !== "approved" && statusLower !== "rejected";
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-8">
            <h1 className="text-xl font-semibold text-slate-900">Wellness Services</h1>
            <NotificationBell
              alerts={alerts}
              onMarkAsRead={markAsRead}
              onMarkAllAsRead={markAllAsRead}
              onClearAll={clearAll}
            />
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">
            {/* Search and Action Bar */}
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
              <Button
                onClick={handleOpenOnboardDialog}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Onboard Partner Service
              </Button>
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReviewDialog(service)}
                              disabled={!canApprove(service.status)}
                              className="disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {getNextStatus(service.status)}
                            </Button>
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
      </main>

      {/* Onboard Service Dialog */}
      <Dialog open={isOnboardDialogOpen} onOpenChange={setIsOnboardDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Onboard Partner Service</DialogTitle>
            <DialogDescription>
              Fill in the details to onboard a new partner service.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitOnboard}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Service Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter service name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Service Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter service description"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partner">Partner *</Label>
                <Select
                  value={formData.partnerId}
                  onValueChange={(value) => setFormData({ ...formData, partnerId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select partner" />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((partner: any) => (
                      <SelectItem key={partner.id} value={partner.id}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="e.g., 50.00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="INR">INR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="billingCycle">Billing Cycle *</Label>
                  <Select
                    value={formData.billingCycle}
                    onValueChange={(value) => setFormData({ ...formData, billingCycle: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="YEARLY">Yearly</SelectItem>
                      <SelectItem value="ONE_TIME">One Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="serviceType">Service Type *</Label>
                  <Select
                    value={formData.serviceType}
                    onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DIGITAL">Digital</SelectItem>
                      <SelectItem value="PHYSICAL">Physical</SelectItem>
                      <SelectItem value="HYBRID">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Service Tags</Label>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant={selectedTags.includes(tag) ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          selectedTags.includes(tag)
                            ? "bg-blue-600 hover:bg-blue-700"
                            : "hover:bg-slate-100"
                        }`}
                        onClick={() => handleToggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-sm text-slate-600 mb-2">Selected tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.map((tag) => (
                          <Badge
                            key={tag}
                            className="bg-blue-600 hover:bg-blue-700 pr-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="ml-1 hover:bg-blue-800 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialogs} disabled={onboardLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={onboardLoading}>
                {onboardLoading ? "Onboarding..." : "Onboard Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Service Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Review Partner Service</DialogTitle>
            <DialogDescription>
              Review the service details and approve or reject the submission.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="review-name">Service Name</Label>
              <Input
                id="review-name"
                value={formData.name}
                readOnly
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-description">Service Description</Label>
              <Textarea
                id="review-description"
                value={formData.description}
                readOnly
                disabled
                className="bg-slate-50"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-partner">Partner</Label>
              <Input
                id="review-partner"
                value={selectedService?.partner?.name || ""}
                readOnly
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-category">Category</Label>
              <Input
                id="review-category"
                value={formData.category}
                readOnly
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="review-pricing">Pricing</Label>
                <Input
                  id="review-pricing"
                  value={selectedService ? `${selectedService.price} ${selectedService.currency}, ${selectedService.billingCycle}` : ''}
                  readOnly
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="review-service-type">Service Type</Label>
                <Input
                  id="review-service-type"
                  value={selectedService?.serviceType || ''}
                  readOnly
                  disabled
                  className="bg-slate-50"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-status">Current Status</Label>
              <Input
                id="review-status"
                value={selectedService?.status || ""}
                readOnly
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="review-notes">Notes</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter review notes (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            {loadingReview ? (
              <div className="text-center py-2">
                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : (
              reviewActions.map((action) => (
                <Button
                  key={action.type}
                  type="button"
                  variant={action.type === "rejected" ? "outline" : "default"}
                  onClick={() => handleReviewAction(action)}
                  disabled={executingAction}
                  className={
                    action.type === "rejected"
                      ? "border-red-300 text-red-600 hover:bg-red-50"
                      : "bg-green-600 hover:bg-green-700 text-white"
                  }
                >
                  {action.type === "rejected" ? (
                    <XCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  {executingAction ? "Processing..." : action.buttonName}
                </Button>
              ))
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Made with Bob
