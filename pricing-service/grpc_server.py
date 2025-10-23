"""
gRPC Server for Pricing Service
High-performance binary protocol for Node.js <-> FastAPI communication
"""

import grpc
from concurrent import futures
import time
import logging
from typing import Dict, Any

# Will be generated from proto file
# import pricing_pb2
# import pricing_pb2_grpc

from pricing_engine import PricingEngine
from learning.outcomes_storage import OutcomesStorage

logger = logging.getLogger(__name__)

class PricingServicer:
    """
    gRPC servicer implementation for PricingService
    """

    def __init__(self):
        self.engine = PricingEngine()
        self.outcomes_storage = OutcomesStorage()
        self.start_time = time.time()

    def GetPriceQuote(self, request, context):
        """
        Get pricing quote - maps to /score endpoint
        """
        try:
            # Convert gRPC request to internal format
            score_request = {
                "property_id": request.property_id,
                "stay_date": request.stay_date,
                "product_type": request.product_type,
                "refundable": request.refundable,
                "los": request.los,
                "toggles": {
                    "strategy": request.toggles.strategy,
                    "use_ml": request.toggles.use_ml,
                    "use_competitors": request.toggles.use_competitors,
                    "use_weather": request.toggles.use_weather,
                    "use_events": request.toggles.use_events,
                },
                "capacity": request.capacity,
            }

            # Add optional toggles
            if request.toggles.HasField("demand_sensitivity"):
                score_request["toggles"]["demand_sensitivity"] = request.toggles.demand_sensitivity
            if request.toggles.HasField("price_aggression"):
                score_request["toggles"]["price_aggression"] = request.toggles.price_aggression
            if request.toggles.HasField("occupancy_target"):
                score_request["toggles"]["occupancy_target"] = request.toggles.occupancy_target
            if request.toggles.HasField("min_price_override"):
                score_request["toggles"]["min_price_override"] = request.toggles.min_price_override
            if request.toggles.HasField("max_price_override"):
                score_request["toggles"]["max_price_override"] = request.toggles.max_price_override

            # Add price grid if provided
            if request.allowed_price_grid:
                score_request["allowed_price_grid"] = list(request.allowed_price_grid)

            # Call pricing engine
            result = self.engine.score(score_request)

            # Convert response to gRPC format
            import pricing_pb2

            response = pricing_pb2.PriceQuoteResponse()
            response.price = result.get("price", 0.0)

            if "price_grid" in result:
                response.price_grid.extend(result["price_grid"])

            if "conf_band" in result:
                response.conf_band.lower = result["conf_band"].get("lower", 0.0)
                response.conf_band.upper = result["conf_band"].get("upper", 0.0)

            if "expected" in result:
                if "occ_now" in result["expected"]:
                    response.expected.occ_now = result["expected"]["occ_now"]
                if "occ_end_bucket" in result["expected"]:
                    response.expected.occ_end_bucket = result["expected"]["occ_end_bucket"]
                if "revenue" in result["expected"]:
                    response.expected.revenue = result["expected"]["revenue"]

            if "reasons" in result:
                response.reasons.extend(result["reasons"])

            if "safety" in result:
                for key, value in result["safety"].items():
                    response.safety[key] = str(value)

            logger.info(f"gRPC GetPriceQuote: property={request.property_id}, date={request.stay_date}, price={response.price}")
            return response

        except Exception as e:
            logger.error(f"gRPC GetPriceQuote error: {e}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            import pricing_pb2
            return pricing_pb2.PriceQuoteResponse()

    def SubmitOutcomes(self, request, context):
        """
        Submit learning outcomes - maps to /learn endpoint
        """
        try:
            # Convert gRPC request to internal format
            outcomes = []
            for outcome in request.outcomes:
                outcome_dict = {
                    "property_id": outcome.property_id,
                    "stay_date": outcome.stay_date,
                    "quoted_price": outcome.quoted_price,
                    "booked": outcome.booked,
                    "timestamp": outcome.timestamp,
                }

                if outcome.HasField("final_price"):
                    outcome_dict["final_price"] = outcome.final_price

                if outcome.metadata:
                    outcome_dict["metadata"] = dict(outcome.metadata)

                outcomes.append(outcome_dict)

            # Group by property and store
            from collections import defaultdict
            by_property = defaultdict(list)
            for outcome in outcomes:
                by_property[outcome["property_id"]].append(outcome)

            processed = 0
            for property_id, prop_outcomes in by_property.items():
                result = self.outcomes_storage.store_outcomes(property_id, prop_outcomes)
                processed += result.get("stored", 0)

            # Return response
            import pricing_pb2

            response = pricing_pb2.SubmitOutcomesResponse()
            response.success = True
            response.processed = processed
            response.message = f"Stored {processed} outcomes"

            logger.info(f"gRPC SubmitOutcomes: processed={processed}")
            return response

        except Exception as e:
            logger.error(f"gRPC SubmitOutcomes error: {e}", exc_info=True)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            import pricing_pb2
            response = pricing_pb2.SubmitOutcomesResponse()
            response.success = False
            response.processed = 0
            response.message = str(e)
            return response

    def HealthCheck(self, request, context):
        """
        Health check
        """
        import pricing_pb2

        response = pricing_pb2.HealthCheckResponse()
        response.status = "healthy"
        response.version = "1.0.0"
        response.uptime_seconds = int(time.time() - self.start_time)

        return response


def serve(port: int = 50051):
    """
    Start gRPC server
    """
    import pricing_pb2_grpc

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ('grpc.max_send_message_length', 50 * 1024 * 1024),  # 50MB
            ('grpc.max_receive_message_length', 50 * 1024 * 1024),
        ]
    )

    pricing_pb2_grpc.add_PricingServiceServicer_to_server(
        PricingServicer(), server
    )

    server.add_insecure_port(f'[::]:{port}')
    server.start()

    logger.info(f"✅ gRPC server started on port {port}")

    try:
        server.wait_for_termination()
    except KeyboardInterrupt:
        logger.info("⏹️  gRPC server stopping...")
        server.stop(0)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    serve()
