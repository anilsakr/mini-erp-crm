import { customerService } from './customer.service';
import { productService } from './product.service';
import { challanService } from './challan.service';
import { stockMovementService } from './stockMovement.service';

// Deliberately simple: a handful of counts plus a couple of recent-activity
// lists. The case study explicitly warns against building complex analytics
// that weren't asked for.
export const dashboardService = {
  async getSummary() {
    const [customerStats, productStats, challanStats, recentMovements] = await Promise.all([
      customerService.getStats(),
      productService.getStats(),
      challanService.getStats(),
      stockMovementService.listRecent(5),
    ]);

    return {
      customers: { total: customerStats.total, active: customerStats.active },
      products: { total: productStats.total, lowStock: productStats.lowStock },
      challans: { draft: challanStats.draft, confirmed: challanStats.confirmed, recent: challanStats.recent },
      recentStockMovements: recentMovements,
    };
  },
};
