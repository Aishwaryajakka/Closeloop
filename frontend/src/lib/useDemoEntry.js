import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function useDemoEntry() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();
  return async () => {
    try {
      await demoLogin();
      navigate("/staff");
    } catch (e) {
      toast.error("Could not start the demo. Please try again.");
    }
  };
}
