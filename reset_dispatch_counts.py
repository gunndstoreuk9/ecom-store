#!/usr/bin/env python3
"""
Reset dispatch counts for agents by updating dispatched orders.

Usage: python reset_dispatch_counts.py [--dry-run] [--agent-id AGENT_ID]
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), "backend"))

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from backend.app.core.database import get_db
from backend.app.models.order import Order
from backend.app.models.agent import Agent
from datetime import datetime, timezone


def get_dispatched_orders_by_agent(db: Session):
    """Get orders that contribute to dispatch count, grouped by agent."""
    
    # Query orders that count towards dispatched_count
    query = db.query(
        Order.assigned_agent_id,
        Agent.name.label("agent_name"),
        func.count(Order.id).label("dispatched_count"),
        func.array_agg(Order.public_order_number).label("order_numbers")
    ).join(
        Agent, Order.assigned_agent_id == Agent.id
    ).filter(
        and_(
            Order.dispatched_at.isnot(None),
            Order.delivery_tracking.isnot(None)
        )
    ).group_by(Order.assigned_agent_id, Agent.name).all()
    
    return query


def reset_agent_dispatch_count(db: Session, agent_id: str, action: str = "mark_shipped", dry_run: bool = True):
    """
    Reset dispatch count for a specific agent.
    
    Actions:
    - mark_shipped: Change status to 'shipped' (recommended)
    - clear_dispatch: Clear dispatched_at and delivery_tracking
    - mark_delivered: Change status to 'delivered'
    """
    
    orders = db.query(Order).filter(
        and_(
            Order.assigned_agent_id == agent_id,
            Order.dispatched_at.isnot(None),
            Order.delivery_tracking.isnot(None)
        )
    ).all()
    
    if not orders:
        print(f"No dispatched orders found for agent {agent_id}")
        return 0
    
    print(f"Found {len(orders)} dispatched orders for agent {agent_id}")
    
    if dry_run:
        print("DRY RUN - Orders that would be updated:")
        for order in orders:
            print(f"  - {order.public_order_number}: {order.status} -> {action}")
        return len(orders)
    
    # Apply the action
    for order in orders:
        if action == "mark_shipped":
            order.status = "shipped"
        elif action == "mark_delivered":
            order.status = "delivered"
        elif action == "clear_dispatch":
            order.dispatched_at = None
            order.delivery_tracking = None
            # Keep status as is
        
        print(f"Updated {order.public_order_number}: {action}")
    
    db.commit()
    return len(orders)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Reset agent dispatch counts")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be changed without making changes")
    parser.add_argument("--agent-id", help="Specific agent ID to reset (optional)")
    parser.add_argument("--action", choices=["mark_shipped", "mark_delivered", "clear_dispatch"], 
                       default="mark_shipped", help="Action to take on dispatched orders")
    
    args = parser.parse_args()
    
    db = next(get_db())
    
    try:
        # Show current dispatch counts
        print("Current dispatched orders by agent:")
        print("=" * 50)
        
        dispatched_by_agent = get_dispatched_orders_by_agent(db)
        
        for row in dispatched_by_agent:
            print(f"{row.agent_name}: {row.dispatched_count} dispatched orders")
            if args.dry_run or args.agent_id:
                print(f"  Orders: {', '.join(row.order_numbers)}")
        
        print()
        
        if args.agent_id:
            # Reset specific agent
            updated = reset_agent_dispatch_count(db, args.agent_id, args.action, args.dry_run)
            if updated > 0:
                print(f"{'Would update' if args.dry_run else 'Updated'} {updated} orders for agent {args.agent_id}")
        else:
            # Show options for each agent
            if dispatched_by_agent:
                print("To reset dispatch counts, run:")
                for row in dispatched_by_agent:
                    print(f"  python reset_dispatch_counts.py --agent-id {row.assigned_agent_id} --action mark_shipped")
                print()
                print("Add --dry-run to see what would be changed first")
    
    finally:
        db.close()


if __name__ == "__main__":
    main()