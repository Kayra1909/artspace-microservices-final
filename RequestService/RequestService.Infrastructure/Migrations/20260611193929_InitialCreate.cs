using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RequestService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArtworkRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    State = table.Column<string>(type: "text", nullable: false),
                    ProgressMode = table.Column<string>(type: "text", nullable: false),
                    ProposedPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    ProposedDeliveryTime = table.Column<string>(type: "text", nullable: true),
                    ProposedDeadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AgreedPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    AgreedDeliveryTime = table.Column<string>(type: "text", nullable: true),
                    AgreedDeadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Deliverable = table.Column<string>(type: "text", nullable: true),
                    ArtworkId = table.Column<Guid>(type: "uuid", nullable: true),
                    RequesterId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequesterUsername = table.Column<string>(type: "text", nullable: false),
                    RequesterEmail = table.Column<string>(type: "text", nullable: false),
                    ArtistId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArtistUsername = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArtworkRequests", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RequestLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    FromState = table.Column<string>(type: "text", nullable: false),
                    ToState = table.Column<string>(type: "text", nullable: false),
                    Action = table.Column<string>(type: "text", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorRole = table.Column<string>(type: "text", nullable: false),
                    ActorUsername = table.Column<string>(type: "text", nullable: false),
                    PayloadPrice = table.Column<decimal>(type: "numeric", nullable: true),
                    PayloadBudget = table.Column<decimal>(type: "numeric", nullable: true),
                    PayloadDeadline = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PayloadNote = table.Column<string>(type: "text", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequestLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RequestLogs_ArtworkRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "ArtworkRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RequestMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderId = table.Column<Guid>(type: "uuid", nullable: false),
                    SenderUsername = table.Column<string>(type: "text", nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RequestMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RequestMessages_ArtworkRequests_RequestId",
                        column: x => x.RequestId,
                        principalTable: "ArtworkRequests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ArtworkRequests_ArtistId",
                table: "ArtworkRequests",
                column: "ArtistId");

            migrationBuilder.CreateIndex(
                name: "IX_ArtworkRequests_RequesterId",
                table: "ArtworkRequests",
                column: "RequesterId");

            migrationBuilder.CreateIndex(
                name: "IX_RequestLogs_RequestId_IdempotencyKey",
                table: "RequestLogs",
                columns: new[] { "RequestId", "IdempotencyKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RequestMessages_RequestId",
                table: "RequestMessages",
                column: "RequestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RequestLogs");

            migrationBuilder.DropTable(
                name: "RequestMessages");

            migrationBuilder.DropTable(
                name: "ArtworkRequests");
        }
    }
}
