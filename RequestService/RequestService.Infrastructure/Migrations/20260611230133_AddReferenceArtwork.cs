using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RequestService.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddReferenceArtwork : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReferenceArtworks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: false),
                    Budget = table.Column<decimal>(type: "numeric", nullable: true),
                    DeliveryTime = table.Column<string>(type: "text", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Rating = table.Column<int>(type: "integer", nullable: false),
                    Review = table.Column<string>(type: "text", nullable: false),
                    ArtistId = table.Column<Guid>(type: "uuid", nullable: false),
                    ArtistUsername = table.Column<string>(type: "text", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientUsername = table.Column<string>(type: "text", nullable: false),
                    HiddenByClient = table.Column<bool>(type: "boolean", nullable: false),
                    HiddenByArtist = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReferenceArtworks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReferenceArtworks_RequestId",
                table: "ReferenceArtworks",
                column: "RequestId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReferenceArtworks");
        }
    }
}
